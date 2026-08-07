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
