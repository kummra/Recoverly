import { z } from "zod";

export const MAX_WEEKLY_GOAL_ML = 5000;
export const DRINK_TYPES = ["beer", "wine", "whiskey", "vodka", "other"] as const;
export const MESSAGE_ROLES = ["user", "assistant"] as const;

/** Goal intent. "reduce" tracks against a weekly ml limit; "quit" means the
 *  target is zero alcohol. Without this, a 0 ml goal is indistinguishable from
 *  "no goal set", and someone aiming to stop was shown "no goal". */
export const GOAL_TYPES = ["reduce", "quit"] as const;

export const goalSchema = z.object({
  goalWeeklyMl: z.number().int().min(0).max(MAX_WEEKLY_GOAL_ML),
  goalType: z.enum(GOAL_TYPES).optional(),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional(),
  // The user's "why" — their anchor on hard days (identity-based reinforcement).
  motivation: z.string().trim().max(200).optional(),
  // What they'd like to be called.
  displayName: z.string().trim().max(60).optional()
});

export const drinkRecordSchema = z.object({
  quantity: z.number().int().min(1).max(5000),
  type: z.enum(DRINK_TYPES),
  // Free-text name when type is "other". Optional on purpose — logging honestly
  // matters more than completeness, so we never block a log to demand it.
  otherType: z.string().trim().max(40).optional(),
  mood: z.string().trim().max(120).optional(),
  createdAt: z.date().optional()
});

// ─── AUDIT assessment results ───────────────────────────────────────────────
export const AUDIT_ZONES = ["low", "hazardous", "harmful", "possible-dependence"] as const;

export const auditResultSchema = z.object({
  score: z.number().int().min(0).max(40),
  zone: z.enum(AUDIT_ZONES),
  /** Raw answers keyed by question id, so a result can be revisited later. */
  answers: z.record(z.string(), z.number().int().min(0).max(4)),
  createdAt: z.date().optional()
});

// ─── Craving events ─────────────────────────────────────────────────────────
// Logged when someone opens the SOS flow. The outcome is recorded without
// judgement: reaching for help is the win, whatever happened next.
export const CRAVING_OUTCOMES = ["passed", "drank", "unresolved"] as const;
export const CRAVING_INTENSITIES = [1, 2, 3, 4, 5] as const;

export const cravingEventSchema = z.object({
  intensity: z.number().int().min(1).max(5),
  outcome: z.enum(CRAVING_OUTCOMES),
  /** What set it off, in their own words. */
  trigger: z.string().trim().max(120).optional(),
  /** Seconds spent in the urge-surfing timer before they closed it. */
  secondsElapsed: z.number().int().min(0).max(7200).optional(),
  createdAt: z.date().optional()
});

export const aiMessageSchema = z.object({
  role: z.enum(MESSAGE_ROLES),
  content: z.string().trim().min(1).max(2000)
});

/** Maximum messages sent per API request (sliding context window). */
export const AI_CONTEXT_WINDOW = 50;

export const aiRequestSchema = z.object({
  // Used directly as a Firestore document id. Restrict the charset so a value
  // like "a/b/c" can't be interpreted as a nested path (it stays inside the
  // caller's own subtree either way, but odd path depths throw at runtime).
  chatId: z
    .string()
    .trim()
    .min(4)
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/, "chatId may only contain letters, numbers, hyphens and underscores")
    .optional(),
  messages: z.array(aiMessageSchema).min(1).max(AI_CONTEXT_WINDOW)
});

// ─── Sobriety signals (breathalyser-agnostic) ───────────────────────────────
// One record type for every input source so the app timeline is uniform:
//  - guardian_ambient / guardian_breath : SEN0376 device — PRESENCE only (no BAC)
//  - manual                              : a reading typed from any breathalyser (Jupiter, clinic, etc.)
//  - bluetooth                           : future auto-sync from a BLE device
export const SOBRIETY_SOURCES = [
  "guardian_ambient", // SEN0376 ambient air — presence only
  "guardian_breath", // SEN0376 breath — presence only
  "breathalyser_mq3", // MQ-3 quantitative path (ESTIMATED BAC; auto-engaged when SEN0376 saturates)
  "manual", // typed in from any external breathalyser (Jupiter/clinic)
  "bluetooth" // future BLE auto-sync from a calibrated device
] as const;

// Sources whose BAC/BrAC is only an estimate from an uncalibrated semiconductor
// sensor — the app must label these "estimated, not for legal/medical use".
export const ESTIMATED_BAC_SOURCES = ["breathalyser_mq3"] as const;

// Normalised presence outcome shown on the timeline for every source.
export const SOBRIETY_RESULTS = ["clear", "detected"] as const;

export const sobrietySignalSchema = z
  .object({
    source: z.enum(SOBRIETY_SOURCES),
    result: z.enum(SOBRIETY_RESULTS),
    // Raw ambient/breath sensor value (SEN0376, 0–5 ppm + headroom). Presence only.
    ppm: z.number().min(0).max(50).optional(),
    // Quantitative values — ONLY valid for manual/bluetooth (a real calibrated device).
    bac: z.number().min(0).max(1).optional(), // % BAC (e.g. 0.08)
    brac: z.number().min(0).max(10).optional(), // mg/L breath
    deviceName: z.string().trim().max(60).optional(), // e.g. "Jupiter …" for manual entries
    note: z.string().trim().max(200).optional(),
    createdAt: z.date().optional()
  })
  // Guard the honesty rule at the schema layer: the SEN0376 presence sources must
  // never carry a BAC/BrAC number. Quantitative values are only valid from the
  // MQ-3 path (estimated) or manual/bluetooth (calibrated) devices.
  .refine(
    (s) => !((s.source === "guardian_ambient" || s.source === "guardian_breath") && (s.bac != null || s.brac != null)),
    { message: "SEN0376 presence signals cannot carry a BAC/BrAC value." }
  );

// Device → user binding for IoT ingest. Token is sent in the Authorization header,
// never in the body; the server stores only its hash.
//  - sobriety_guardian : personal ambient watch + blow-to-check
//  - campus_detector   : NGO/facility "alcohol-free zone" ambient monitor
//  - breathalyser      : blow-to-check with the SEN0376→MQ-3 BAC path
export const deviceRegisterSchema = z.object({
  label: z.string().trim().min(1).max(60),
  kind: z.enum(["sobriety_guardian", "campus_detector", "breathalyser"]).default("sobriety_guardian")
});

export type AuditResultInput = z.infer<typeof auditResultSchema>;
export type CravingEventInput = z.infer<typeof cravingEventSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type DrinkRecordInput = z.infer<typeof drinkRecordSchema>;
export type AIRequestInput = z.infer<typeof aiRequestSchema>;
export type AIMessageInput = z.infer<typeof aiMessageSchema>;
export type SobrietySignalInput = z.infer<typeof sobrietySignalSchema>;
export type DeviceRegisterInput = z.infer<typeof deviceRegisterSchema>;
