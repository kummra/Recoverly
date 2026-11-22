/**
 * The one recognition Recoverly can point to, stated once so the fact sheet and
 * the Organization markup that search engines read can never disagree.
 *
 * Checked against the competition's own page (`url`) on 22 November 2026. Recoverly
 * was the technology part of a school campaign, so the wording says that rather
 * than claiming the prize for the app alone. Add to this only what a public page
 * can back up.
 */
export const RECOGNITION = {
  campaign: "Substance Abuse - Anti-Alcohol Saviours",
  result: "Overall Junior Winner 2025/26",
  competition: "Global Social Leaders Global Goals Competition",
  organiser: "Future Foundations",
  url: "https://www.globalsocialleaders.com/substance_abuse/"
} as const;

/** One sentence, used verbatim in the markup and as the fact sheet's lead line. */
export const RECOGNITION_SENTENCE = `Recoverly was the technology part of the school campaign "${RECOGNITION.campaign}", named ${RECOGNITION.result} at the ${RECOGNITION.competition}, which ${RECOGNITION.organiser} runs.`;
