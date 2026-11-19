/**
 * The strict check on what an organisation types for its people. Unlike `sanitiseProgrammeContent`, which quietly
 * drops what it cannot use (right for a stored value), this tells the organisation what is wrong: a mistyped
 * helpline number that is silently dropped would leave the organisation believing it is shown.
 *
 * Plain and safe for browsers, so the portal form and the server give the same answers.
 */
import { LOCALES, isLocale } from "@/lib/i18n/types";
import { PROGRAMME_LIMITS as L, type ProgrammeContent, cleanContactPhone, cleanEmail, cleanHttpsUrl, cleanText, sanitiseProgrammeContent } from "@/lib/programme";

/** The helpline number that was retired in 2024. Built from parts so no source file carries it as one run of digits. */
const RETIRED_HELPLINE_DIGITS = ["1800", "599", "0019"].join("");

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const given = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const tooLong = (value: unknown, max: number): boolean => given(value).length > max;

export type ContentCheck = { content: ProgrammeContent | null; errors: string[] };

export function checkProgrammeContent(input: unknown): ContentCheck {
  if (!isObject(input)) return { content: null, errors: ["Nothing was sent."] };
  const errors: string[] = [];

  if (tooLong(input.name, L.nameMax)) errors.push(`The name is too long: at most ${L.nameMax} characters.`);
  else if (cleanText(input.name, L.nameMax).length < 2) errors.push("Give the programme a name of at least 2 characters.");

  const welcomeIn = isObject(input.welcome) ? input.welcome : {};
  const english = cleanText(welcomeIn.en, L.welcomeMax);
  if (!given(welcomeIn.en)) errors.push(`Write a welcome in English (at least ${L.welcomeMin} characters). Other languages are optional.`);
  else if (english.length < L.welcomeMin) errors.push(`The English welcome is too short: at least ${L.welcomeMin} characters.`);
  for (const locale of LOCALES) {
    if (tooLong(welcomeIn[locale], L.welcomeMax)) errors.push(`The ${locale === "en" ? "English" : locale} welcome is too long: at most ${L.welcomeMax} characters.`);
  }

  if (input.locale !== undefined && input.locale !== "" && !isLocale(input.locale)) errors.push("That is not a language we support for the first screen.");

  const rows = Array.isArray(input.contacts) ? input.contacts : [];
  const contacts = rows.filter((row) => isObject(row) && (given(row.label) || given(row.phone) || given(row.email) || given(row.url) || given(row.hours)));
  if (contacts.length > L.contactsMax) errors.push(`At most ${L.contactsMax} support contacts.`);
  contacts.forEach((row, index) => {
    const contact = row as Record<string, unknown>;
    const where = `Contact ${index + 1}`;
    if (!given(contact.label)) errors.push(`${where} needs a label, such as "Employee assistance line".`);
    else if (tooLong(contact.label, L.labelMax)) errors.push(`${where}: the label is too long (at most ${L.labelMax} characters).`);

    let reachable = false;
    if (given(contact.phone)) {
      const phone = cleanContactPhone(contact.phone);
      if (!phone) errors.push(`${where}: the phone number must be 3 to 15 digits, with an optional + at the start.`);
      else if (phone.replace(/\D/g, "") === RETIRED_HELPLINE_DIGITS || phone.replace(/\D/g, "").endsWith(RETIRED_HELPLINE_DIGITS)) {
        errors.push(`${where}: that helpline was retired. Tele-MANAS (14416) is the national line and is already shown to everyone.`);
      } else reachable = true;
    }
    if (given(contact.email)) {
      if (tooLong(contact.email, L.emailMax) || !cleanEmail(contact.email)) errors.push(`${where}: that is not a valid email address.`);
      else reachable = true;
    }
    if (given(contact.url)) {
      if (!cleanHttpsUrl(contact.url)) errors.push(`${where}: the link must be a complete address starting with https://.`);
      else reachable = true;
    }
    if (!reachable && !errors.some((e) => e.startsWith(`${where}:`))) errors.push(`${where} needs a phone number, an email address or a link.`);
    if (tooLong(contact.hours, L.hoursMax)) errors.push(`${where}: the hours are too long (at most ${L.hoursMax} characters). Say 24 hours only if it is true.`);
  });

  const planRows = Array.isArray(input.plans) ? input.plans : [];
  const plans = planRows.filter((row) => isObject(row) && (given(row.when) || given(row.then)));
  if (plans.length > L.plansMax) errors.push(`At most ${L.plansMax} ready-made plans.`);
  plans.forEach((row, index) => {
    const plan = row as Record<string, unknown>;
    if (!given(plan.when) || !given(plan.then)) errors.push(`Plan ${index + 1} needs both a "when" and a "then".`);
    else if (tooLong(plan.when, L.planTextMax) || tooLong(plan.then, L.planTextMax)) errors.push(`Plan ${index + 1} is too long: at most ${L.planTextMax} characters for each part.`);
  });

  const questionRows = (Array.isArray(input.questions) ? input.questions : []).filter((q) => given(q));
  if (questionRows.length > L.questionsMax) errors.push(`At most ${L.questionsMax} check-in questions.`);
  if (questionRows.some((q) => tooLong(q, L.questionMax))) errors.push(`A check-in question is too long: at most ${L.questionMax} characters.`);

  if (errors.length) return { content: null, errors };
  const content = sanitiseProgrammeContent({
    name: input.name,
    welcome: welcomeIn,
    contacts: contacts,
    locale: isLocale(input.locale) ? input.locale : undefined,
    plans,
    questions: questionRows
  });
  return content ? { content, errors: [] } : { content: null, errors: ["That could not be saved. Check the name and welcome."] };
}
