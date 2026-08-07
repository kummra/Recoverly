/**
 * AUDIT — Alcohol Use Disorders Identification Test (WHO).
 *
 * Ten items, each scored 0–4 (items 9 and 10 score 0/2/4), total 0–40.
 * Questions are reproduced verbatim; altering the wording invalidates the
 * instrument's scoring.
 *
 * Source: Saunders JB, Aasland OG, Babor TF et al. Development of the Alcohol
 * Use Disorders Identification Test (AUDIT). Addiction 1993;88:791–803.
 *
 * ⚠ This is a SCREENING tool, never a diagnosis. A score cannot confirm or rule
 * out an alcohol use disorder — only a clinician can. Every band routes the
 * user toward professional support, and higher bands carry the project's
 * standing warning that stopping suddenly can be medically dangerous.
 */

export type AuditQuestion = {
  id: number;
  text: string;
  /** In order; index is the point value, except items 9–10 (see `points`). */
  options: string[];
  /** Point value per option index. */
  points: number[];
};

const FREQ = ["Never", "Less than monthly", "Monthly", "Weekly", "Daily or almost daily"];
const FREQ_POINTS = [0, 1, 2, 3, 4];
const YES_NO = ["No", "Yes, but not in the past year", "Yes, during the past year"];
const YES_NO_POINTS = [0, 2, 4];

export const AUDIT_QUESTIONS: AuditQuestion[] = [
  {
    id: 1,
    text: "How often do you have a drink containing alcohol?",
    options: ["Never", "Monthly or less", "2–4 times a month", "2–3 times a week", "4 or more times a week"],
    points: FREQ_POINTS
  },
  {
    id: 2,
    text: "How many standard drinks containing alcohol do you have on a typical day when drinking?",
    options: ["1 or 2", "3 or 4", "5 or 6", "7 to 9", "10 or more"],
    points: FREQ_POINTS
  },
  {
    id: 3,
    text: "How often do you have six or more drinks on one occasion?",
    options: FREQ,
    points: FREQ_POINTS
  },
  {
    id: 4,
    text: "During the past year, how often have you found that you were not able to stop drinking once you had started?",
    options: FREQ,
    points: FREQ_POINTS
  },
  {
    id: 5,
    text: "During the past year, how often have you failed to do what was normally expected of you because of drinking?",
    options: FREQ,
    points: FREQ_POINTS
  },
  {
    id: 6,
    text: "During the past year, how often have you needed a drink in the morning to get yourself going after a heavy drinking session?",
    options: FREQ,
    points: FREQ_POINTS
  },
  {
    id: 7,
    text: "During the past year, how often have you had a feeling of guilt or remorse after drinking?",
    options: FREQ,
    points: FREQ_POINTS
  },
  {
    id: 8,
    text: "During the past year, have you been unable to remember what happened the night before because you had been drinking?",
    options: FREQ,
    points: FREQ_POINTS
  },
  {
    id: 9,
    text: "Have you or someone else been injured as a result of your drinking?",
    options: YES_NO,
    points: YES_NO_POINTS
  },
  {
    id: 10,
    text: "Has a relative or friend, doctor or other health worker been concerned about your drinking or suggested you cut down?",
    options: YES_NO,
    points: YES_NO_POINTS
  }
];

export const AUDIT_MAX_SCORE = 40;

export type AuditZone = "low" | "hazardous" | "harmful" | "possible-dependence";

export type AuditResult = {
  score: number;
  zone: AuditZone;
  /** i18n keys — the UI translates these, so the result speaks the reader's language. */
  labelKey: string;
  meaningKey: string;
  guidanceKey: string;
  /** True when the sudden-cessation warning must be shown (project rule #3). */
  showWithdrawalWarning: boolean;
};

/**
 * Total the answers. `answers` maps question id -> selected option index.
 * Unanswered questions score 0, so a partial result is always an *under*
 * estimate rather than an alarming over-estimate.
 */
export function scoreAudit(answers: Record<number, number>): number {
  let total = 0;
  for (const q of AUDIT_QUESTIONS) {
    const idx = answers[q.id];
    if (idx == null) continue;
    const pts = q.points[idx];
    if (typeof pts === "number") total += pts;
  }
  return total;
}

export function isAuditComplete(answers: Record<number, number>): boolean {
  return AUDIT_QUESTIONS.every((q) => typeof answers[q.id] === "number");
}

/**
 * WHO risk zones: 0–7 low, 8–15 hazardous, 16–19 harmful, 20+ possible
 * dependence. Copy is deliberately calm — someone scoring 30 is exactly the
 * person we must not frighten away from the app.
 */
export function interpretAudit(score: number): AuditResult {
  if (score <= 7) {
    return {
      score,
      zone: "low",
      labelKey: "audit.lowLabel",
      meaningKey: "audit.lowMeaning",
      guidanceKey: "audit.lowGuidance",
      showWithdrawalWarning: false
    };
  }
  if (score <= 15) {
    return {
      score,
      zone: "hazardous",
      labelKey: "audit.hazardousLabel",
      meaningKey: "audit.hazardousMeaning",
      guidanceKey: "audit.hazardousGuidance",
      showWithdrawalWarning: true
    };
  }
  if (score <= 19) {
    return {
      score,
      zone: "harmful",
      labelKey: "audit.harmfulLabel",
      meaningKey: "audit.harmfulMeaning",
      guidanceKey: "audit.harmfulGuidance",
      showWithdrawalWarning: true
    };
  }
  return {
    score,
    zone: "possible-dependence",
    labelKey: "audit.dependenceLabel",
    meaningKey: "audit.dependenceMeaning",
    guidanceKey: "audit.dependenceGuidance",
    showWithdrawalWarning: true
  };
}
