import type { BindParameters } from "oracledb";
import {
  getOracleConnection,
  isOracleCircuitOpen,
  isOracleConfigured,
  recordOracleFailure,
  recordOracleSuccess,
  withOracleTimeout
} from "@/lib/oracle-db";

type SimpleBinds = Record<string, string | number | null>;

function safeLog(msg: string, err?: unknown) {
  // eslint-disable-next-line no-console
  console.warn(`[OracleSync] ${msg}`, err instanceof Error ? err.message : (err ?? ""));
}

function asBinds(obj: SimpleBinds): BindParameters {
  return obj as unknown as BindParameters;
}

async function runSql(
  sql: string,
  binds: SimpleBinds,
  options: { autoCommit: boolean } = { autoCommit: true }
): Promise<void> {
  if (!isOracleConfigured || isOracleCircuitOpen()) return;

  try {
    await withOracleTimeout(
      (async () => {
        let conn;
        try {
          conn = await getOracleConnection();
          await conn.execute(sql, asBinds(binds), options);
        } finally {
          if (conn) {
            try { await conn.close(); } catch { /* ignore */ }
          }
        }
      })()
    );
    recordOracleSuccess();
  } catch (err) {
    recordOracleFailure();
    safeLog("Write failed", err);
  }
}

// ─── User Profiles ──────────────────────────────────────────────────────────

export async function syncUserProfile(
  userId: string,
  data: Record<string, unknown>
): Promise<void> {
  await runSql(
    `MERGE INTO user_profiles t
       USING (SELECT :user_id AS user_id FROM dual) s
       ON (t.user_id = s.user_id)
     WHEN MATCHED THEN
       UPDATE SET data_json = :data_json, updated_at = SYSTIMESTAMP
     WHEN NOT MATCHED THEN
       INSERT (user_id, data_json, updated_at)
       VALUES (:user_id, :data_json, SYSTIMESTAMP)`,
    { user_id: userId, data_json: JSON.stringify(data) }
  );
}

// ─── Drink Records ──────────────────────────────────────────────────────────

export async function syncDrinkRecord(
  recordId: string,
  userId: string,
  data: Record<string, unknown>
): Promise<void> {
  await runSql(
    `MERGE INTO drink_records t
       USING (SELECT :record_id AS record_id FROM dual) s
       ON (t.record_id = s.record_id)
     WHEN MATCHED THEN
       UPDATE SET data_json = :data_json
     WHEN NOT MATCHED THEN
       INSERT (record_id, user_id, data_json, created_at)
       VALUES (:record_id, :user_id, :data_json, SYSTIMESTAMP)`,
    { record_id: recordId, user_id: userId, data_json: JSON.stringify(data) }
  );
}

export async function deleteSyncedDrinkRecords(userId: string): Promise<void> {
  await runSql(
    `DELETE FROM drink_records WHERE user_id = :user_id`,
    { user_id: userId }
  );
}

// ─── Chat Sessions ──────────────────────────────────────────────────────────

export async function syncChatSession(
  chatId: string,
  userId: string,
  data: Record<string, unknown>
): Promise<void> {
  await runSql(
    `MERGE INTO chat_sessions t
       USING (SELECT :chat_id AS chat_id FROM dual) s
       ON (t.chat_id = s.chat_id)
     WHEN MATCHED THEN
       UPDATE SET data_json = :data_json, updated_at = SYSTIMESTAMP
     WHEN NOT MATCHED THEN
       INSERT (chat_id, user_id, data_json, created_at, updated_at)
       VALUES (:chat_id, :user_id, :data_json, SYSTIMESTAMP, SYSTIMESTAMP)`,
    { chat_id: chatId, user_id: userId, data_json: JSON.stringify(data) }
  );
}

// ─── Chat Messages ──────────────────────────────────────────────────────────

export async function syncChatMessage(
  messageId: string,
  userId: string,
  chatId: string,
  data: Record<string, unknown>
): Promise<void> {
  await runSql(
    `MERGE INTO chat_messages t
       USING (SELECT :message_id AS message_id FROM dual) s
       ON (t.message_id = s.message_id)
     WHEN MATCHED THEN
       UPDATE SET data_json = :data_json
     WHEN NOT MATCHED THEN
       INSERT (message_id, user_id, chat_id, data_json, created_at)
       VALUES (:message_id, :user_id, :chat_id, :data_json, SYSTIMESTAMP)`,
    {
      message_id: messageId,
      user_id: userId,
      chat_id: chatId,
      data_json: JSON.stringify(data),
    }
  );
}

export async function deleteSyncedChatSessions(userId: string): Promise<void> {
  if (!isOracleConfigured || isOracleCircuitOpen()) return;

  let conn;
  try {
    conn = await withOracleTimeout(getOracleConnection());
    await conn.execute(
      `DELETE FROM chat_messages WHERE user_id = :user_id`,
      asBinds({ user_id: userId }),
      { autoCommit: false }
    );
    await conn.execute(
      `DELETE FROM chat_sessions WHERE user_id = :user_id`,
      asBinds({ user_id: userId }),
      { autoCommit: true }
    );
    recordOracleSuccess();
  } catch (err) {
    recordOracleFailure();
    safeLog("Delete chat sessions failed", err);
  } finally {
    if (conn) {
      try { await conn.close(); } catch { /* ignore */ }
    }
  }
}

// ─── Device Data (links + breathalyzer tests) ──────────────────────────────

export async function syncDeviceLink(
  deviceId: string,
  userId: string,
  linkedAt: number
): Promise<void> {
  const id = `link_${userId}_${deviceId}`;
  await runSql(
    `MERGE INTO device_data t
       USING (SELECT :record_id AS record_id FROM dual) s
       ON (t.record_id = s.record_id)
     WHEN MATCHED THEN
       UPDATE SET data_json = :data_json, created_at = SYSTIMESTAMP
     WHEN NOT MATCHED THEN
       INSERT (record_id, device_id, user_id, data_type, data_json, created_at)
       VALUES (:record_id, :device_id, :user_id, 'link', :data_json, SYSTIMESTAMP)`,
    {
      record_id: id,
      device_id: deviceId,
      user_id: userId,
      data_json: JSON.stringify({ deviceId, userId, linkedAt }),
    }
  );
}

export async function deleteSyncedDeviceLink(
  deviceId: string,
  userId: string
): Promise<void> {
  await runSql(
    `DELETE FROM device_data WHERE device_id = :device_id AND user_id = :user_id AND data_type = 'link'`,
    { device_id: deviceId, user_id: userId }
  );
}

// ─── Sobriety signals (breathalyser-agnostic) ──────────────────────────────

export async function syncSobrietySignal(
  signalId: string,
  userId: string,
  source: string,
  result: string,
  data: Record<string, unknown>
): Promise<void> {
  await runSql(
    `MERGE INTO sobriety_signals t
       USING (SELECT :signal_id AS signal_id FROM dual) s
       ON (t.signal_id = s.signal_id)
     WHEN MATCHED THEN
       UPDATE SET data_json = :data_json
     WHEN NOT MATCHED THEN
       INSERT (signal_id, user_id, source, result, data_json, created_at)
       VALUES (:signal_id, :user_id, :source, :result, :data_json, SYSTIMESTAMP)`,
    {
      signal_id: signalId,
      user_id: userId,
      source,
      result,
      data_json: JSON.stringify(data)
    }
  );
}

// ─── Account deletion ───────────────────────────────────────────────────────

/**
 * Permanently purge ALL of a user's mirrored data from Oracle, across every
 * table. Called from the account-deletion route so the "delete everything"
 * privacy guarantee holds in Oracle Cloud too, not just Firestore (privacy rule #4).
 */
export async function deleteAllUserData(userId: string): Promise<void> {
  if (!isOracleConfigured || isOracleCircuitOpen()) return;

  let conn;
  try {
    conn = await withOracleTimeout(getOracleConnection());
    const tables = [
      "chat_messages",
      "chat_sessions",
      "drink_records",
      "device_data",
      "sobriety_signals",
      "user_profiles",
    ];
    for (const table of tables) {
      await conn.execute(
        `DELETE FROM ${table} WHERE user_id = :user_id`,
        asBinds({ user_id: userId }),
        { autoCommit: false }
      );
    }
    await conn.execute("COMMIT");
    recordOracleSuccess();
  } catch (err) {
    recordOracleFailure();
    safeLog("Delete all user data failed", err);
  } finally {
    if (conn) {
      try { await conn.close(); } catch { /* ignore */ }
    }
  }
}
