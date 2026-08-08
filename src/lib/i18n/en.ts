import type { Dictionary } from "@/lib/i18n/types";

/**
 * English source strings. This file is the canonical key list — every other
 * locale is checked against it in tests, so a missing or stray key fails CI
 * rather than silently shipping an untranslated screen.
 *
 * `{name}` placeholders are interpolated at call time.
 */
export const en: Dictionary = {
  // Navigation & chrome
  "nav.home": "Home",
  "nav.dashboard": "Dashboard",
  "nav.records": "Records",
  "nav.assessment": "Self-check",
  "nav.ai": "Our AI",
  "nav.settings": "Settings",
  "nav.support": "Support & helplines",
  "nav.login": "Log in",
  "nav.logout": "Log out",
  "nav.openMenu": "Open menu",
  "nav.closeMenu": "Close menu",
  "nav.themeToLight": "Switch to light theme",
  "nav.themeToDark": "Switch to dark theme",

  "footer.tagline": "Recoverly — Your compassionate recovery companion.",
  "footer.howItWorks": "How it works",
  "footer.faq": "FAQ",
  "footer.privacy": "Privacy",
  "footer.terms": "Terms",
  "footer.disclaimer": "Not a substitute for professional medical advice.",

  // Dashboard
  "dashboard.title": "Dashboard",
  "dashboard.subtitle": "Pause, breathe, and log intentionally.",
  "dashboard.quickCheckIn": "Quick Check-in",
  "dashboard.quickCheckInBody":
    "Awareness is a skill you are strengthening. Every log is data that empowers your future self.",
  "dashboard.logDrink": "Alcohol consumed.",
  "dashboard.journeyStarts": "Your journey starts here",
  "dashboard.journeyStartsBody":
    "Every step toward awareness counts. Your first check-in begins your progress.",
  "dashboard.choosingAwareness": "choosing awareness",
  "dashboard.daysAlcoholFree": "days alcohol-free",
  "dashboard.dayAlcoholFree": "day alcohol-free",
  "dashboard.identityLine": "You are someone who is choosing awareness — one day at a time.",
  "dashboard.freshPage": "A fresh page today",
  // {days} is substituted as a styled span, so the number can sit wherever the
  // target language puts it rather than being glued to the end of the sentence.
  "dashboard.freshPageBody":
    "Awareness is the win, and it carries forward. Your best run so far is {days}.",
  "dashboard.dayUnit": "day",
  "dashboard.daysUnit": "days",
  "dashboard.welcome": "Welcome",
  "dashboard.welcomeBody": "Let's set up your space — it takes a moment.",
  "dashboard.longestStreak": "longest streak",
  "dashboard.alcoholFreeDays": "alcohol-free days",
  "dashboard.mindfulCheckIns": "mindful check-ins",
  "dashboard.monthTotal": "{month} total",
  "dashboard.weeklyVsGoal": "Weekly vs goal",
  "dashboard.noGoal": "no goal",
  "dashboard.thisMonth": "This month",
  "dashboard.checkIns": "check-ins",
  "dashboard.recentActivity": "Recent activity",
  "dashboard.recentActivityBody": "Your last check-ins at a glance.",
  "dashboard.noRecords": "No records yet. Your first log will appear here.",
  "dashboard.loadFailed":
    "We couldn't load your data just now — your records are safe. Check your connection and refresh to try again.",

  // Craving SOS
  "sos.trigger": "I'm struggling right now",
  "sos.title": "Let's ride this out together",
  "sos.intro":
    "Cravings rise, peak and pass — usually within a few minutes. You don't have to fight it, just outlast it.",
  "sos.howStrong": "How strong is it right now?",
  "sos.scaleHint": "1 = mild · 5 = overwhelming",
  "sos.intensityAria": "Intensity {n} of 5",
  "sos.crisisPrefix": "In crisis?",
  "sos.start": "Start",
  "sos.riding": "Riding the wave",
  "sos.breatheIn": "Breathe in",
  "sos.hold": "Hold",
  "sos.breatheOut": "Breathe out",
  "sos.easeHint": "most cravings ease within about five minutes",
  "sos.talkItThrough": "Talk it through",
  "sos.getHelpNow": "Get help now",
  "sos.done": "I'm done",
  "sos.outcomeTitle": "How did it go?",
  "sos.outcomeBody": "There's no wrong answer here. Reaching for support is the part that counts.",
  "sos.outcomePassed": "It passed — I didn't drink",
  "sos.outcomeDrank": "I drank",
  "sos.outcomeUnresolved": "Still with me",
  "sos.doneTitle": "That took strength",
  "sos.doneBody":
    "You reached for support instead of doing this alone — that's the skill that carries forward. Every time you ride one out, the next is a little easier.",
  "sos.close": "Close",

  // Safety (highest priority to translate accurately)
  "safety.notMedicalTitle": "Support, not medical advice",
  "safety.notMedicalBody":
    "Recoverly helps you reflect on your habits — it is not medical care. If you drink heavily, stopping suddenly can be dangerous (withdrawal can cause seizures). Please talk to a doctor before making big changes to how much you drink.",
  "safety.crisisTitle": "In crisis or thinking about self-harm? Help is available now",
  "safety.crisisIndia": "India",
  "safety.outsideIndia": "Outside India",
  "safety.findHelpline": "Find a local helpline",
  "safety.emergency": "Emergency services",
  "safety.withdrawalTitle": "Before you stop drinking — please read",
  "safety.withdrawalBody":
    "If you drink heavily or every day, stopping suddenly can be medically dangerous — abrupt withdrawal can cause seizures or delirium tremens, which can be life-threatening. Please talk to a doctor before you quit, and only reduce or stop under medical supervision.",

  // Home
  "home.greetingMorning": "Good morning",
  "home.greetingAfternoon": "Good afternoon",
  "home.greetingEvening": "Good evening",
  // {identity} is rendered as a gradient span, so its position stays flexible.
  "home.heroTitle": "You are building a {identity}.",
  "home.heroIdentity": "healthier identity",
  "home.heroBody":
    "This app helps you notice patterns, create gentle friction before choices, and celebrate every meaningful reduction in alcohol consumption.",
  "home.badgeProgress": "Progress, not perfection",
  "home.badgeCalm": "Calm decisions create long-term freedom",
  "home.logCheckIn": "Log a check-in",
  "home.thisMonth": "This month",
  "home.totalCheckIns": "Total check-ins",
  "home.logged": "logged",
  "home.quickActions": "Quick actions",
  "home.viewRecords": "View records",
  "home.talkToAi": "Talk to AI",
  "home.todaysFocus": "Today's focus",
  "home.quoteFooter": "A new thought surfaces each day to anchor your intention.",
  "home.recoveryMindset": "Recovery mindset",
  "home.ctaTitle": "Start your recovery journey",
  "home.ctaBody":
    "Create a free account to track consumption, view insights, and talk to our AI guide.",
  "home.getStarted": "Get started",
  "home.quote1": "Small steps repeated daily become your strongest identity.",
  "home.quote2": "Recovery is not about perfection; it is about direction.",
  "home.quote3": "Each honest check-in is proof that you care about your future.",
  "home.quote4": "The bravest thing you can do today is notice and choose differently.",
  "home.quote5": "Patterns change one intentional pause at a time.",
  "home.quote6": "What you track, you transform.",
  "home.quote7": "Your commitment is visible in every log you make.",

  // Log a drink
  "log.quantity": "Quantity (ml)",
  "log.quantityPlaceholder": "e.g. 330",
  "log.drinkType": "Drink type",
  "log.selectType": "Select drink type",
  "log.typeBeer": "beer",
  "log.typeWine": "wine",
  "log.typeWhiskey": "whiskey",
  "log.typeVodka": "vodka",
  "log.typeOther": "other",
  "log.otherPlaceholder": "e.g. rum, cider, cocktail",
  "log.mood": "How are you feeling?",
  "log.moodPlaceholder": "Stressed, social pressure, celebration…",
  "log.secondsRemaining": "{n}s remaining",
  "log.readyToSubmit": "Ready to submit",
  "log.invalid": "Please provide a valid quantity and drink type.",
  "log.saveFailed": "Could not save this record. Please try again.",

  // Onboarding
  "onboarding.welcome": "Welcome to Recoverly",
  "onboarding.welcomeBody": "A calm, judgment-free space. Let's set you up in two small steps.",
  "onboarding.whyLabel": "What's bringing you here?",
  "onboarding.whyHint":
    "This becomes your anchor on hard days. Optional — you can add it later in Settings.",
  "onboarding.skip": "Skip for now",
  "onboarding.next": "Next",
  "onboarding.goalTitle": "Set a gentle goal",
  "onboarding.goalBody":
    "Small and realistic beats all-or-nothing. You can change this any time.",
  "onboarding.goalLabel": "Weekly limit (ml)",
  "onboarding.goalPlaceholder": "e.g. 750",
  "onboarding.aimToStop": "I'm aiming to stop entirely (0 ml)",
  "onboarding.back": "Back",
  "onboarding.start": "Start my journey",
  "onboarding.saveFailed": "Could not save right now. Please try again.",

  // Daily nudge
  "nudge.title": "Your daily check-in",
  "nudge.dismiss": "Dismiss reminder",

  // Account & data management
  "account.yourData": "Your data",
  "account.yourDataDesc": "Take a copy with you, or clear what you no longer need.",
  "account.exporting": "Preparing…",
  "account.exportCsv": "Export my records (CSV)",
  "account.noRecordsToExport": "You have no records to export yet.",
  "account.deleteTitle": "Delete your account?",
  "account.deleteBody":
    "This permanently deletes your account and every record tied to it. There is no way to recover it. Type {word} to confirm.",
  "account.deleteConfirmLabel": "Type {word} to confirm",
  "account.deleting": "Deleting…",
  "account.deletePermanently": "Permanently delete",
  "account.deleteFailed": "Could not delete your account. Please try again.",
  "account.pwDesc": "You'll need your current password to confirm it's you.",
  "account.currentPw": "Current password",
  "account.newPw": "New password",
  "account.confirmPw": "Confirm new password",
  "account.updating": "Updating…",
  "account.updatePw": "Update password",
  "account.pwMismatch": "New passwords do not match.",
  "account.pwSameAsOld": "New password must be different from the current one.",
  "account.pwUpdated": "Password updated.",
  "account.pwWrongCurrent": "Current password is incorrect.",
  "account.pwTooWeak": "That password is too weak. Try a longer one.",
  "account.pwTooManyAttempts": "Too many attempts. Please wait a moment and try again.",
  "account.pwUpdateFailed": "Could not update password. Please try again.",

  // Remaining chrome & confirmations
  "nav.primary": "Primary navigation",
  "nav.mobile": "Mobile navigation",
  "ai.pageTitle": "Recovery AI",
  "ai.conversations": "Conversations",
  "ai.newChat": "New chat",
  "ai.loadingConversation": "Loading conversation…",
  "ai.emptyState": "Start a conversation. I'm here to listen without judgment.",
  "ai.sessionHistory": "Chat session history",
  "log.pauseTitle": "Pause before logging",
  "log.pauseBody":
    "This moment of friction helps bring your conscious choice back into the process.",
  "log.whatDidYouHave": "What did you have?",
  "nudge.body":
    "However today went, showing up here is the win. Take a moment to reflect — no judgment either way.",
  "account.deleteChatsDesc":
    "This permanently removes every AI conversation. Your records and goals stay.",
  "account.deleteChats": "Delete all AI conversations",
  "account.yesDelete": "Yes, delete",
  "account.deleteAccountTitle": "Delete account",
  "account.deleteAccountDesc":
    "Permanently remove your account and all of your data — drink records, goals, and AI conversations. This cannot be undone.",
  "account.deleteAccountCta": "Delete my account & data",
  "account.changePassword": "Change password",
  "audit.beforeYouChange": "Before you change anything, please read",
  "audit.answerAll": "Answer every question for an accurate score.",

  // Records & insights
  "records.title": "Records & Insights",
  "records.subtitle": "Your data tells the story of progress.",
  "records.loadFailedTitle": "Couldn't load your records",
  "records.loadFailedBody":
    "Your data is safe — we just couldn't reach it right now. Check your connection and refresh the page to try again.",
  "records.emptyTitle": "No records yet",
  "records.emptyBody": "Log your first check-in from Dashboard to start seeing insights.",
  "records.currentMonth": "Current month",
  "records.dailyAverage": "Daily average",
  "records.previousMonth": "Previous month",
  "records.improvement": "Improvement",
  "records.projection": "6-mo projection",
  "records.insight": "Insight",
  "records.dailyConsumption": "Daily consumption",
  "records.dailyConsumptionDesc": "Current month day by day",
  "records.monthlyTotals": "Monthly totals",
  "records.monthlyTotalsDesc": "Your trend over time",
  "records.noneYet": "No records yet.",

  // Generated insight copy (keys come from src/lib/analytics.ts)
  "insight.none":
    "You have no logged drinks this month. Keep reinforcing the routines helping you stay steady.",
  "insight.down": "Your monthly intake is down by {percent}%. Consistent effort is clearly working.",
  "insight.up":
    "Your current trend is higher than last month. A small pause and support check-in can help reset momentum.",
  "insight.stable":
    "Your monthly pattern is stable. Small daily choices now can create a visible long-term drop.",

  "milestone.day1": "First day",
  "milestone.day3": "Three days",
  "milestone.week1": "One week",
  "milestone.week2": "Two weeks",
  "milestone.month1": "One month",
  "milestone.month2": "Two months",
  "milestone.month3": "Three months",
  "milestone.month6": "Six months",
  "milestone.year1": "One year",
  "milestone.generic": "{days} days",

  "trigger.sundays": "Sundays",
  "trigger.mondays": "Mondays",
  "trigger.tuesdays": "Tuesdays",
  "trigger.wednesdays": "Wednesdays",
  "trigger.thursdays": "Thursdays",
  "trigger.fridays": "Fridays",
  "trigger.saturdays": "Saturdays",
  "trigger.lateNights": "late nights (midnight–6am)",
  "trigger.mornings": "mornings (6am–noon)",
  "trigger.afternoons": "afternoons (noon–6pm)",
  "trigger.evenings": "evenings (6pm–midnight)",
  "trigger.mood": "feeling \u201c{mood}\u201d",

  "progress.gotBack": "What you've got back",
  "progress.gotBackDesc": "This month compared with {month}, your heaviest recent month.",
  "progress.notSpent": "not spent",
  "progress.caloriesAvoided": "calories avoided",
  "progress.estimateNote":
    "Estimates from typical prices and standard calorie values — a guide, not exact figures.",
  "progress.milestones": "Milestones",
  "progress.milestonesProgress": "{reached} reached — {remaining} to {next}",
  "progress.milestonesNext": "{reached} reached — next is {next}",
  "progress.allReached": "Every milestone reached. Remarkable.",
  "progress.dayCount": "{n} day",
  "progress.daysCount": "{n} days",
  "progress.patterns": "Patterns worth knowing",
  "progress.patternsDesc":
    "Noticing when it tends to happen is what makes it easier to plan around — this isn't a judgement.",
  "progress.clusterAround": "Most of your logs cluster around",

  // FAQ
  "faq.title": "Frequently Asked Questions",
  "faq.intro": "Honest answers about how Recoverly works and how we keep you safe.",
  "faq.q1": "Is Recoverly a medical service?",
  "faq.a1":
    "No. Recoverly offers emotional support, motivation, and a simple way to track your drinking. It is not a doctor, and it does not diagnose, treat, or cure addiction. For anything medical, please speak to a qualified professional.",
  "faq.q2": "Can I just stop drinking straight away?",
  "faq.a2":
    "If you drink heavily or every day, stopping suddenly can be medically dangerous — withdrawal can cause seizures or delirium tremens. Please see a doctor before you quit and only reduce or stop under medical supervision. Recoverly will never push you to quit cold turkey.",
  "faq.q3": "Is my data private?",
  "faq.a3":
    "Yes. Your records, goals, and chats are tied to your own account and are not visible to anyone else. Data is encrypted in transit and at rest, and we never sell or share your personal information. You can permanently delete everything from Settings → Delete account at any time.",
  "faq.q4": "How does the AI coach work?",
  "faq.a4":
    "When you chat, your message is sent through a secure server to an AI model that replies with non-judgmental support. It is designed to avoid medical advice and to point you to real help when needed. It is a companion for motivation and reflection — not a clinician.",
  "faq.q5": "What happens if I mention self-harm or crisis?",
  "faq.a5":
    "Your safety comes first. If the app detects crisis language, it will always show real helpline numbers (such as Tele-MANAS 14416) so you can reach someone who can help right away. You can also visit the Support page at any time.",
  "faq.q6": "Why does Recoverly add a short delay before logging a drink?",
  "faq.a6":
    "That brief pause is intentional — a few seconds to reconsider is a gentle, proven nudge. There's no shame either way: logging honestly is how you see real progress.",
  "faq.q7": "Will Recoverly shame me if I slip?",
  "faq.a7":
    "Never. Recovery isn't a straight line. Recoverly is built on encouragement and identity-based reinforcement — you are someone who is choosing awareness — not guilt or scolding.",
  "faq.q8": "Does Recoverly cost anything?",
  "faq.a8":
    "Recoverly is free to use. It is part of a youth-led anti-addiction project focused on helping people, not profit.",
  "faq.q9": "Can Recoverly replace therapy or a de-addiction programme?",
  "faq.a9":
    "No. Think of it as support between and alongside professional care. If you need treatment, a doctor or de-addiction specialist is the right place to start — see the Support page for how to find help.",
  "faq.stillHaveQuestion":
    "Still have a question? If it's urgent or about your health, please reach out via the",
  "faq.supportPage": "Support page",

  // How it works
  "guide.title": "How Recoverly works",
  "guide.intro": "Six simple steps. Go at your own pace — every step toward awareness counts.",
  "guide.step1Title": "1. Create your account",
  "guide.step1Body":
    "Sign up with email, Google, or your phone number. Your space is private and tied only to you.",
  "guide.step2Title": "2. Set a gentle weekly goal",
  "guide.step2Body":
    "Choose a weekly limit that feels realistic. Small, sustainable change beats an all-or-nothing promise — and you can adjust it any time.",
  "guide.step3Title": "3. Log honestly",
  "guide.step3Body":
    "Record each drink in a few taps. A short pause appears before you confirm — a few seconds to reconsider. There's no shame either way; honesty is what makes your progress real.",
  "guide.step4Title": "4. Watch your progress",
  "guide.step4Body":
    "Your dashboard turns those logs into clear insights and trends — so you can see momentum building, even when the wins feel small.",
  "guide.step5Title": "5. Talk to your AI companion",
  "guide.step5Body":
    "Whenever you need a non-judgmental nudge, motivation, or someone to think things through with, the AI coach is there — emotional support, never medical advice.",
  "guide.step6Title": "6. Get real help when you need it",
  "guide.step6Body":
    "If things get hard, the Support page has crisis helplines and guidance on finding professional care. Quitting heavy drinking should always be done with a doctor.",
  "guide.getStarted": "Get started",
  "guide.needHelpNow": "Need help now?",

  // Privacy & terms
  "legal.lastUpdated": "Last updated: February 2026",
  // Translations of legal text are for understanding; the English governs.
  "legal.englishGoverns":
    "This is a translation provided for your convenience. If anything differs, the English version applies.",
  "privacy.title": "Privacy Policy",
  "privacy.s1Title": "What we collect",
  "privacy.s1Body":
    "We only collect data needed to provide recovery tracking and guidance features: your email, drink records, weekly goals, and AI chat history.",
  "privacy.s2Title": "Where data is stored",
  "privacy.s2Body":
    "Your account data is stored in Firebase and scoped to your authenticated identity. Records are encrypted in transit and at rest.",
  "privacy.s3Title": "AI conversations",
  "privacy.s3Body":
    "AI requests are sent through secure server routes, where your identity is verified before any reply. API keys are never exposed to clients. Your conversation history is stored in Firestore under your account.",
  "privacy.s4Title": "Data deletion",
  "privacy.s4Body":
    "You can permanently delete your account and all associated data at any time from Settings → Delete account. This removes your drink records, goals, and AI chat history, and cannot be undone.",
  "privacy.s5Title": "Third parties",
  "privacy.s5Body":
    "We do not sell or share your personal data with third parties. Analytics, if any, are anonymized and aggregated.",
  "terms.title": "Terms of Use",
  "terms.s1Title": "Purpose",
  "terms.s1Body":
    "This application is designed for habit support and progress reflection. It helps you track alcohol consumption, identify patterns, and receive AI-assisted guidance.",
  "terms.s2Title": "Not medical advice",
  "terms.s2Body":
    "Recoverly is not a substitute for medical diagnosis, treatment, or emergency intervention. Always consult a healthcare professional for medical concerns.",
  "terms.s3Title": "Your responsibility",
  "terms.s3Body":
    "You are responsible for decisions made based on app content and AI responses. The insights and suggestions provided are informational, not prescriptive.",
  "terms.s4Title": "Emergency situations",
  "terms.s4Body":
    "Do not use this service to delay urgent help if you are in immediate danger. If you or someone you know is at risk, contact emergency services immediately.",
  "terms.s5Title": "AI limitations",
  "terms.s5Body":
    "The AI assistant is designed to be compassionate and supportive but may not always provide perfect advice. It cannot replace a licensed counselor or therapist.",

  // Support & helplines page
  "support.title": "Support & Helplines",
  "support.intro":
    "If things feel heavy right now, reaching out is a sign of strength — not weakness. You don't have to do this alone.",
  "support.crisisHeading": "In crisis or thinking of self-harm? Call now (India)",
  "support.teleManasName": "Tele-MANAS",
  "support.teleManasDetail": "24/7 national mental-health support",
  "support.kiranName": "KIRAN Helpline",
  "support.kiranDetail": "24/7 mental-health rehabilitation",
  "support.emergencyName": "Emergency services",
  "support.emergencyDetail": "If you or someone else is in immediate danger",
  "support.outsideIndia": "Outside India",
  "support.outsideIndiaBefore": "You can find a free, confidential helpline in your country at",
  "support.outsideIndiaAfter":
    ". If you are in immediate danger, please call your local emergency number.",
  "support.professionalHeading": "Finding professional help",
  "support.professionalBody1":
    "A doctor, psychiatrist, or de-addiction specialist can assess your situation and build a safe, personalised plan. Government de-addiction centres and many NGOs offer this free of cost.",
  "support.professionalBody2":
    "Tele-MANAS (above) can also connect you to qualified mental-health professionals near you.",
  "support.leanOnHeading": "Lean on people you trust",
  "support.leanOnBody":
    "Telling one person you trust — a friend, family member, or colleague — makes a real difference. Recovery is easier when you're not carrying it alone.",
  "support.footerNote":
    "Recoverly offers emotional support and motivation only — not medical advice, diagnosis, or treatment.",

  // AI coach
  "ai.newConversation": "New conversation",
  "ai.newChatTitle": "New guidance chat",
  "ai.assistantDesc": "This assistant focuses on non-judgmental recovery support.",
  "ai.conversationLog": "AI conversation log",
  "ai.inputPlaceholder": "What's on your mind today?",
  "ai.send": "Send message",
  "ai.requestFailed": "Could not get AI response. Please try again.",

  // AUDIT questionnaire
  "audit.pageTitle": "Alcohol self-check (AUDIT)",
  "audit.pageIntro":
    "Ten questions from the World Health Organization's screening tool. Answering honestly is the only way it tells you anything useful — nobody else sees this.",
  "audit.notDiagnosisLead": "This is a screening questionnaire, not a diagnosis.",
  "audit.translationNote":
    "The questions are translated for readability. Scoring follows the WHO's English original, so please go through your result with a doctor.",
  "audit.yourScore": "Your score",
  "audit.findSupport": "Find support",
  "audit.summaryForDoctor": "Summary for my doctor",
  "audit.takeAgain": "Take it again",
  "audit.previousResults": "Your previous results",
  "audit.previousResultsDesc": "Scores can move as your drinking changes.",
  "audit.answeredCount": "{n} of {total} answered",
  "audit.freqNever": "Never",
  "audit.freqLessMonthly": "Less than monthly",
  "audit.freqMonthly": "Monthly",
  "audit.freqWeekly": "Weekly",
  "audit.freqDaily": "Daily or almost daily",
  "audit.noAnswer": "No",
  "audit.yesNotPastYear": "Yes, but not in the past year",
  "audit.yesPastYear": "Yes, during the past year",
  "audit.q1": "How often do you have a drink containing alcohol?",
  "audit.q1o1": "Never",
  "audit.q1o2": "Monthly or less",
  "audit.q1o3": "2–4 times a month",
  "audit.q1o4": "2–3 times a week",
  "audit.q1o5": "4 or more times a week",
  "audit.q2":
    "How many standard drinks containing alcohol do you have on a typical day when drinking?",
  "audit.q2o1": "1 or 2",
  "audit.q2o2": "3 or 4",
  "audit.q2o3": "5 or 6",
  "audit.q2o4": "7 to 9",
  "audit.q2o5": "10 or more",
  "audit.q3": "How often do you have six or more drinks on one occasion?",
  "audit.q4":
    "During the past year, how often have you found that you were not able to stop drinking once you had started?",
  "audit.q5":
    "During the past year, how often have you failed to do what was normally expected of you because of drinking?",
  "audit.q6":
    "During the past year, how often have you needed a drink in the morning to get yourself going after a heavy drinking session?",
  "audit.q7":
    "During the past year, how often have you had a feeling of guilt or remorse after drinking?",
  "audit.q8":
    "During the past year, have you been unable to remember what happened the night before because you had been drinking?",
  "audit.q9": "Have you or someone else been injured as a result of your drinking?",
  "audit.q10":
    "Has a relative or friend, doctor or other health worker been concerned about your drinking or suggested you cut down?",

  // AUDIT result bands
  "audit.lowLabel": "Lower risk",
  "audit.lowMeaning":
    "Your answers suggest your drinking currently sits in a lower-risk range. That is worth acknowledging.",
  "audit.lowGuidance":
    "Keep doing what is working. If you are using Recoverly to cut down further, your goals and check-ins will help you track it.",
  "audit.hazardousLabel": "Hazardous range",
  "audit.hazardousMeaning":
    "Your answers suggest a pattern that may be putting your health at risk over time. This is common, and noticing it now is a genuinely useful thing to have done.",
  "audit.hazardousGuidance":
    "Setting a weekly goal and logging honestly can make a real difference. Talking it through with a doctor or counsellor is a genuinely useful next step.",
  "audit.harmfulLabel": "Harmful range",
  "audit.harmfulMeaning":
    "Your answers suggest drinking that is likely already affecting your health or daily life. Recognising that takes courage.",
  "audit.harmfulGuidance":
    "Please speak with a doctor or a de-addiction professional. They can assess your situation properly and build a plan with you. Recoverly can support you alongside that, not instead of it.",
  "audit.dependenceLabel": "Possible dependence",
  "audit.dependenceMeaning":
    "Your answers are consistent with a level of drinking where professional support really matters. This is a screening result, not a diagnosis — but it is worth acting on.",
  "audit.dependenceGuidance":
    "Please contact a doctor or a de-addiction service soon. You do not have to sort this out on your own, and getting help early makes it easier.",

  // Clinician report
  "report.preparing": "Preparing your summary…",
  "report.title": "Summary for your clinician",
  "report.subtitle":
    "A one-page overview to bring to an appointment. Use Print, then choose “Save as PDF” if you'd rather send it.",
  "report.print": "Print / Save as PDF",
  "report.docTitle": "Recoverly — self-reported summary",
  "report.generated": "Generated {date}",
  "report.consumption": "Consumption",
  "report.recordsSince": "Records kept since",
  "report.totalLogged": "Total check-ins logged",
  "report.thisMonth": "This month",
  "report.previousMonth": "Previous month",
  "report.dailyAverage": "Daily average (this month)",
  "report.currentStreak": "Current alcohol-free streak",
  "report.longestStreak": "Longest alcohol-free streak",
  "report.freeDaysThisMonth": "Alcohol-free days this month",
  "report.weeklyGoal": "Weekly goal set",
  "report.notSet": "not set",
  "report.ofTotal": "{n} of {total}",
  "report.auditHeading": "AUDIT screening",
  "report.auditLine":
    "Most recent score {score} / {max} ({label}) on {date}.{extra}",
  "report.auditExtra": " {n} assessments recorded.",
  "report.auditNote":
    "Self-administered WHO AUDIT screening questionnaire. Screening only — not a diagnosis.",
  "report.cravingsHeading": "Cravings",
  "report.cravingsLine":
    "{total} craving episodes logged. {passed} passed without drinking. Average self-rated intensity {avg} of 5.",
  "report.patternsHeading": "Self-reported patterns",
  "report.clusterLine": "Drinking clusters around {pattern} ({percent}% of logs)",
  "report.motivationHeading": "Stated motivation",
  "report.disclaimer":
    "All figures are self-reported by the user through the Recoverly app and are not clinically verified. Recoverly is a self-management and support tool; it does not diagnose, treat or provide medical advice. This summary is intended to support — not replace — clinical assessment.",

  // Settings
  "settings.title": "Settings",
  "settings.subtitle": "Customize your recovery experience.",
  "settings.profileTitle": "Profile & Preferences",
  "settings.profileDesc": "Keep your goals realistic and consistent.",
  "settings.account": "Account",
  "settings.unknown": "Unknown",
  "settings.timezone": "Timezone",
  "settings.yourWhy": "Your why",
  "settings.yourWhyPlaceholder": "My family, my health, the person I want to be…",
  "settings.yourWhyHint": "Your anchor on hard days — shown on your dashboard.",
  "settings.displayName": "Display name",
  "settings.displayNamePlaceholder": "What should we call you?",
  "settings.weeklyGoal": "Weekly goal (ml)",
  "settings.weeklyGoalHint": "Set a weekly consumption limit to track against. 0 means no limit.",
  "settings.reminderTime": "Preferred reminder time",
  "settings.reminderHint":
    "After this time, a gentle check-in prompt appears on your dashboard, once a day.",
  "settings.loadFailed":
    "Could not load your current preferences. Refresh before saving, so you don't overwrite them.",
  "settings.saved": "Preferences saved successfully.",
  "settings.saveFailed": "Could not save preferences. Try again.",
  "settings.appSafety": "App & Safety",
  "settings.appSafetyDesc": "Use this app as support, not as medical replacement.",
  "settings.importantNotice": "Important notice",
  "settings.importantNoticeBody":
    "This app is not a substitute for professional medical advice. If you feel in danger or at risk of self-harm, please seek immediate help from a trusted professional or emergency service.",
  "settings.privacyPolicy": "Privacy Policy",
  "settings.termsOfUse": "Terms of Use",
  "settings.languageDesc": "Choose the language for the app. Your choice is remembered on this device.",

  // Reminder notifications
  "notify.on": "Reminders are on.",
  "notify.onWithTime": "You'll get a notification at your chosen time.",
  "notify.onNoTime": "Set a time above to start getting them.",
  "notify.blocked":
    "Notifications are blocked for this site. You can re-enable them in your browser's site settings — the in-app reminder still works either way.",
  "notify.enable": "Enable reminder notifications",
  "notify.enableHint":
    "Sends one gentle notification a day at your chosen time. Works best with Recoverly installed to your home screen; a fully closed browser may not deliver it.",

  // Login
  // {awareness} is rendered as a gradient span.
  "login.heroTitle": "Every step toward {awareness} is a step worth taking.",
  "login.heroAwareness": "awareness",
  "login.heroBody":
    "You are making a meaningful choice by being here. This platform tracks your journey, provides honest insights, and supports you with compassionate AI guidance.",
  "login.privateTitle": "Private & secure",
  "login.privateBody": "Your data is encrypted and only visible to you.",
  "login.noJudgmentTitle": "No judgment, ever",
  "login.noJudgmentBody": "Built on identity-reinforcement, not shame.",
  "login.createAccount": "Create account",
  "login.welcomeBack": "Welcome back",
  "login.phoneSignIn": "Phone sign-in",
  "login.createDesc": "Set up your recovery companion in seconds.",
  "login.welcomeDesc": "Your journey continues. Sign in to pick up where you left off.",
  "login.otpDesc": "Enter the 6-digit code sent to your phone.",
  "login.smsDesc": "We'll send a verification code via SMS.",
  "login.tabEmail": "Email",
  "login.tabPhone": "Phone",
  "login.password": "Password",
  "login.passwordPlaceholder": "Minimum 6 characters",
  "login.pleaseWait": "Please wait…",
  "login.signIn": "Sign in",
  "login.haveAccount": "Already have an account? Sign in",
  "login.newHere": "New here? Create an account",
  "login.phoneNumber": "Phone number",
  "login.countryCodeHint": "Include country code (e.g. +1 for US, +91 for India).",
  "login.sendingCode": "Sending code…",
  "login.sendCode": "Send verification code",
  "login.verificationCode": "Verification code",
  "login.codeSentTo": "Code sent to {phone}.",
  "login.verifying": "Verifying…",
  "login.verifyAndSignIn": "Verify & sign in",
  "login.changePhone": "Change phone number",
  "login.orContinue": "or continue with",
  "login.googleSignIn": "Sign in with Google",
  "login.authFailed": "Authentication failed. Please verify your credentials and try again.",
  "login.googleFailed": "Google sign-in failed. Please try again.",
  "login.sendFailed": "Could not send code. Verify the phone number and try again.",
  "login.invalidCode": "Invalid code. Please check and try again.",

  // Offline / error
  "offline.title": "You're offline",
  "offline.body":
    "Recoverly needs a connection to load your records. Everything you've logged is safe — it'll be here when you reconnect.",
  "offline.needHelp": "Need help right now?",
  "offline.worksOffline": "These work without internet.",
  "error.title": "Something went wrong",
  "error.body": "Please retry. If this keeps happening, check your connection and try again shortly.",
  "error.retry": "Try again",

  // Common actions
  "common.emergency": "Emergency",
  "common.save": "Save",
  "common.saving": "Saving…",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.loading": "Loading…",
  "common.tryAgain": "Please try again.",
  "common.optional": "(optional)",
  "common.language": "Language"
};
