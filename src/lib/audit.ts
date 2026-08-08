/**
 * AUDIT — Alcohol Use Disorders Identification Test (WHO).
 *
 * Ten items, each scored 0–4 (items 9 and 10 score 0/2/4), total 0–40.
 * The English wording is reproduced verbatim; altering it invalidates the
 * instrument's scoring. Other languages are shown via i18n keys so the
 * questionnaire is answerable by people who do not read English — those are
 * plain translations, not the WHO's officially validated language versions,
 * and the page says so.
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
  /** i18n key for the question text. */
  textKey: string;
  /** i18n keys, in order; index is the point value, except items 9–10. */
  optionKeys: string[];
  /** Point value per option index. */
  points: number[];
};

const FREQ = [
  "audit.freqNever",
  "audit.freqLessMonthly",
  "audit.freqMonthly",
  "audit.freqWeekly",
  "audit.freqDaily"
];
const FREQ_POINTS = [0, 1, 2, 3, 4];
const YES_NO = ["audit.noAnswer", "audit.yesNotPastYear", "audit.yesPastYear"];
const YES_NO_POINTS = [0, 2, 4];

export const AUDIT_QUESTIONS: AuditQuestion[] = [
  {
    id: 1,
    textKey: "audit.q1",
    optionKeys: [
      "audit.q1o1",
      "audit.q1o2",
      "audit.q1o3",
      "audit.q1o4",
      "audit.q1o5"
    ],
    points: FREQ_POINTS
  },
  {
    id: 2,
    textKey: "audit.q2",
    optionKeys: [
      "audit.q2o1",
      "audit.q2o2",
      "audit.q2o3",
      "audit.q2o4",
      "audit.q2o5"
    ],
    points: FREQ_POINTS
  },
  {
    id: 3,
    textKey: "audit.q3",
    optionKeys: FREQ,
    points: FREQ_POINTS
  },
  {
    id: 4,
    textKey: "audit.q4",
    optionKeys: FREQ,
    points: FREQ_POINTS
  },
  {
    id: 5,
    textKey: "audit.q5",
    optionKeys: FREQ,
    points: FREQ_POINTS
  },
  {
    id: 6,
    textKey: "audit.q6",
    optionKeys: FREQ,
    points: FREQ_POINTS
  },
  {
    id: 7,
    textKey: "audit.q7",
    optionKeys: FREQ,
    points: FREQ_POINTS
  },
  {
    id: 8,
    textKey: "audit.q8",
    optionKeys: FREQ,
    points: FREQ_POINTS
  },
  {
    id: 9,
    textKey: "audit.q9",
    optionKeys: YES_NO,
    points: YES_NO_POINTS
  },
  {
    id: 10,
    textKey: "audit.q10",
    optionKeys: YES_NO,
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
