import oracledb from "oracledb";

/**
 * Oracle Autonomous Database connection layer (thin mode — no Instant Client).
 *
 * Oracle Cloud is the durable, relational mirror of the app's data. Firebase
 * (Auth + Firestore) remains the primary, real-time, per-user store; every
 * write is also mirrored here so the data lives equally in Oracle Cloud.
 *
 * The connect string is a 1-way TLS descriptor (protocol=tcps), so thin mode
 * connects without a wallet. Configure via ORACLE_USER / ORACLE_PASSWORD /
 * ORACLE_CONNECT_STRING. If unset, the whole sync layer no-ops (see isOracleConfigured).
 */
const oracleUser = process.env.ORACLE_USER;
const oraclePassword = process.env.ORACLE_PASSWORD;
const oracleConnectString = process.env.ORACLE_CONNECT_STRING;

export const isOracleConfigured = Boolean(
  oracleUser && oraclePassword && oracleConnectString
);

let poolPromise: Promise<oracledb.Pool> | null = null;
let tablesCreated = false;

const TABLE_DDL = [
  `CREATE TABLE user_profiles (
     user_id   VARCHAR2(128) PRIMARY KEY,
     data_json CLOB,
     updated_at TIMESTAMP DEFAULT SYSTIMESTAMP
   )`,
  `CREATE TABLE drink_records (
     record_id  VARCHAR2(128) PRIMARY KEY,
     user_id    VARCHAR2(128) NOT NULL,
     data_json  CLOB,
     created_at TIMESTAMP DEFAULT SYSTIMESTAMP
   )`,
  `CREATE TABLE chat_sessions (
     chat_id    VARCHAR2(128) PRIMARY KEY,
     user_id    VARCHAR2(128) NOT NULL,
     data_json  CLOB,
     created_at TIMESTAMP DEFAULT SYSTIMESTAMP,
     updated_at TIMESTAMP DEFAULT SYSTIMESTAMP
   )`,
  `CREATE TABLE chat_messages (
     message_id VARCHAR2(128) PRIMARY KEY,
     user_id    VARCHAR2(128) NOT NULL,
     chat_id    VARCHAR2(128) NOT NULL,
     data_json  CLOB,
     created_at TIMESTAMP DEFAULT SYSTIMESTAMP
   )`,
  `CREATE TABLE device_data (
     record_id  VARCHAR2(128) PRIMARY KEY,
     device_id  VARCHAR2(128),
     user_id    VARCHAR2(128),
     data_type  VARCHAR2(64) NOT NULL,
     data_json  CLOB,
     created_at TIMESTAMP DEFAULT SYSTIMESTAMP
   )`,
  `CREATE TABLE audit_results (
     result_id  VARCHAR2(128) PRIMARY KEY,
     user_id    VARCHAR2(128) NOT NULL,
     score      NUMBER(3),
     zone       VARCHAR2(32),
     data_json  CLOB,
     created_at TIMESTAMP DEFAULT SYSTIMESTAMP
   )`,
  `CREATE TABLE craving_events (
     event_id   VARCHAR2(128) PRIMARY KEY,
     user_id    VARCHAR2(128) NOT NULL,
     intensity  NUMBER(2),
     outcome    VARCHAR2(32),
     data_json  CLOB,
     created_at TIMESTAMP DEFAULT SYSTIMESTAMP
   )`,
  `CREATE TABLE sobriety_signals (
     signal_id  VARCHAR2(128) PRIMARY KEY,
     user_id    VARCHAR2(128) NOT NULL,
     source     VARCHAR2(32),
     result     VARCHAR2(16),
     data_json  CLOB,
     created_at TIMESTAMP DEFAULT SYSTIMESTAMP
   )`,
];

async function initPool(): Promise<oracledb.Pool> {
  if (!oracleUser || !oraclePassword || !oracleConnectString) {
    throw new Error("Oracle DB is not configured. Set ORACLE_USER, ORACLE_PASSWORD, ORACLE_CONNECT_STRING.");
  }
  return oracledb.createPool({
    user: oracleUser,
    password: oraclePassword,
    connectString: oracleConnectString,
    // Serverless: every warm instance keeps its own pool, so a high poolMax
    // multiplies across instances and can exhaust the Always Free session
    // limit (ORA-00018). Keep it small and let idle connections drop quickly —
    // the mirror is best-effort, so a brief reconnect costs nothing.
    poolMin: 0,
    poolMax: 2,
    poolIncrement: 1,
    poolTimeout: 30,
    queueTimeout: 10_000,
  });
}

async function ensureTables(conn: oracledb.Connection): Promise<void> {
  if (tablesCreated) return;

  for (const ddl of TABLE_DDL) {
    try {
      await conn.execute(ddl);
    } catch (err: unknown) {
      const oraErr = err as { errorNum?: number };
      // ORA-00955: name is already used by an existing object — table exists, skip
      if (oraErr.errorNum === 955) continue;
      // eslint-disable-next-line no-console
      console.warn("[OracleDB] Table creation warning:", err);
    }
  }

  try {
    await conn.execute("COMMIT");
  } catch { /* ignore */ }

  tablesCreated = true;
}

// ─── Availability guard ─────────────────────────────────────────────────────
// Oracle is a best-effort mirror, but a *hanging* mirror is worse than a
// missing one: when the Always Free DB auto-stops, a connection attempt takes
// ~65s to fail, which would stall the user-facing request (and on the AI route
// that means the coach appears broken). So we bound every attempt and trip a
// breaker after repeated failures instead of paying the cost on each request.
const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 60_000;
/** Generous enough for a healthy DB (~0.5s observed), far below any request budget. */
export const ORACLE_OP_TIMEOUT_MS = 3_000;

let consecutiveFailures = 0;
let circuitOpenUntil = 0;

export function isOracleCircuitOpen(): boolean {
  return Date.now() < circuitOpenUntil;
}

export function recordOracleSuccess(): void {
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
}

export function recordOracleFailure(): void {
  consecutiveFailures += 1;
  if (consecutiveFailures >= FAILURE_THRESHOLD) {
    circuitOpenUntil = Date.now() + COOLDOWN_MS;
    consecutiveFailures = 0;
  }
  // A rejected pool promise would be reused forever, leaving the mirror broken
  // even after Oracle recovers. Drop it so the next attempt rebuilds the pool.
  poolPromise = null;
  tablesCreated = false;
}

/** Reject after `ms` so a stalled Oracle can never hold up a response. */
export function withOracleTimeout<T>(work: Promise<T>, ms = ORACLE_OP_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Oracle operation timed out after ${ms}ms`)), ms);
    work.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

export async function getOracleConnection(): Promise<oracledb.Connection> {
  if (!poolPromise) {
    poolPromise = initPool();
  }

  const pool = await poolPromise;
  const conn = await pool.getConnection();

  await ensureTables(conn);

  return conn;
}

export async function closeOraclePool(): Promise<void> {
  if (!poolPromise) return;
  try {
    const pool = await poolPromise;
    await pool.close(0);
  } catch { /* ignore */ }
  poolPromise = null;
  tablesCreated = false;
}
