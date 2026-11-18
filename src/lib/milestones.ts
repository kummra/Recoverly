/**
 * Gentle milestones for a run of alcohol-free days. Only ever shown for a run that exists; nothing here
 * counts down, warns of losing a streak, or compares people (firm rule: no shaming, no loss-framed streaks).
 */
export const MILESTONE_DAYS = [3, 7, 14, 30, 60, 90, 180, 365] as const;

/** The largest milestone the current run has reached, or `null` for a shorter run. */
export function milestoneFor(streakDays: number): number | null {
  let reached: number | null = null;
  for (const days of MILESTONE_DAYS) if (streakDays >= days) reached = days;
  return reached;
}
