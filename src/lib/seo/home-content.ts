/**
 * What the home page says about Recoverly in plain words, for the people who
 * land on it and for the search engines that read it.
 *
 * One list feeds both the visible section (`components/home-about.tsx`) and the
 * structured data (`components/structured-data.tsx`). Markup that names a
 * feature the page does not show is a reason for Google to distrust it, so the
 * two are never written separately. English only, like the organisation pages:
 * the home page has one address, and that address is English.
 */

/** Every item is a thing the app really does today. */
export const HOME_FEATURES = [
  "Private drink and goal tracking",
  "A self-check based on the WHO AUDIT",
  "A craving screen with a breathing exercise and one-tap helplines",
  "Guides with their sources listed",
  "A supportive AI companion that never gives medical advice",
  "Read-aloud and voice input in nine languages"
] as const;

/**
 * The six guides, by address and title. A test checks each title against the
 * real guide, so this cannot drift. It is a short list here, not an import of
 * the guides themselves, so the home page does not carry their full text.
 */
export const HOME_GUIDES = [
  { slug: "stopping-alcohol-safely", title: "Is it safe to stop drinking alcohol suddenly?" },
  { slug: "understanding-audit-score", title: "What does my AUDIT score mean?" },
  { slug: "standard-drink-india", title: "How much alcohol is in a peg, a beer or a glass of wine?" },
  { slug: "coping-with-alcohol-cravings", title: "What to do when you feel a strong urge to drink alcohol" },
  { slug: "after-a-drinking-slip", title: "I drank after trying to stop. What should I do now?" },
  { slug: "helping-someone-who-drinks", title: "How to help a family member who drinks too much" }
] as const;

/** Questions people actually type into a search box, answered plainly. */
export const HOME_FAQ = [
  {
    question: "Is Recoverly really free?",
    answer:
      "Yes. It is free for individuals, always, with no adverts and no selling of data. Organisations such as clinics, employers and colleges can pay for tools that help them offer it to their people."
  },
  {
    question: "Is my information private?",
    answer:
      "Your records belong to your account and nobody else can see them. An organisation that offers Recoverly cannot see who uses it or what anyone logs. If you want to share something, such as a summary for your doctor, you choose what goes in it and you can stop sharing at any time."
  },
  {
    question: "Is Recoverly medical advice?",
    answer:
      "No. It is a support tool, not medical care, and the AI companion is not a counsellor. If you are in crisis, call Tele-MANAS on 14416 or the emergency number 112."
  },
  {
    question: "Is it safe to stop drinking suddenly?",
    answer:
      "Not always. If you drink heavily or every day, stopping suddenly can be dangerous and can cause seizures, so talk to a doctor first."
  },
  {
    question: "Do I need an account, and which languages does it work in?",
    answer:
      "You can read the guides and the helplines page without an account. To track your drinking and set goals you create a free account. Recoverly works in English, Hindi, Marathi, Punjabi, Tamil, Telugu, Kannada, Malayalam and Gujarati."
  }
] as const;
