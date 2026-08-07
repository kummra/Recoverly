import type { Dictionary } from "@/lib/i18n/types";

/**
 * Hindi (हिन्दी).
 *
 * Register note: uses सम्मानजनक "आप" throughout — this app talks to adults
 * about something difficult, and the informal "तू/तुम" would read as
 * condescending. Clinical terms keep the widely-understood English loanword
 * where the Sanskritised form would be unfamiliar in everyday speech
 * (e.g. "डॉक्टर" rather than "चिकित्सक").
 *
 * Helpline numbers stay in Latin digits: they must be dialled exactly, and
 * Devanagari numerals would be a real usability hazard here.
 */
export const hi: Dictionary = {
  // Navigation & chrome
  "nav.home": "होम",
  "nav.dashboard": "डैशबोर्ड",
  "nav.records": "रिकॉर्ड",
  "nav.assessment": "स्व-जाँच",
  "nav.ai": "हमारा AI",
  "nav.settings": "सेटिंग्स",
  "nav.support": "सहायता और हेल्पलाइन",
  "nav.login": "लॉग इन",
  "nav.logout": "लॉग आउट",
  "nav.openMenu": "मेन्यू खोलें",
  "nav.closeMenu": "मेन्यू बंद करें",
  "nav.themeToLight": "लाइट थीम पर जाएँ",
  "nav.themeToDark": "डार्क थीम पर जाएँ",

  "footer.tagline": "Recoverly — आपका सहानुभूतिपूर्ण रिकवरी साथी।",
  "footer.howItWorks": "यह कैसे काम करता है",
  "footer.faq": "सामान्य प्रश्न",
  "footer.privacy": "गोपनीयता",
  "footer.terms": "शर्तें",
  "footer.disclaimer": "यह पेशेवर चिकित्सा सलाह का विकल्प नहीं है।",

  // Dashboard
  "dashboard.title": "डैशबोर्ड",
  "dashboard.subtitle": "रुकें, साँस लें, और सोच-समझकर दर्ज करें।",
  "dashboard.quickCheckIn": "त्वरित चेक-इन",
  "dashboard.quickCheckInBody":
    "जागरूकता एक कौशल है जिसे आप मज़बूत कर रहे हैं। हर एंट्री वह जानकारी है जो आपके आने वाले कल को सशक्त बनाती है।",
  "dashboard.logDrink": "शराब का सेवन किया।",
  "dashboard.journeyStarts": "आपकी यात्रा यहाँ से शुरू होती है",
  "dashboard.journeyStartsBody":
    "जागरूकता की ओर उठाया हर कदम मायने रखता है। आपका पहला चेक-इन ही आपकी प्रगति की शुरुआत है।",
  "dashboard.choosingAwareness": "जागरूकता का चुनाव",
  "dashboard.daysAlcoholFree": "दिन शराब-मुक्त",
  "dashboard.dayAlcoholFree": "दिन शराब-मुक्त",
  "dashboard.identityLine": "आप वह व्यक्ति हैं जो जागरूकता चुन रहे हैं — एक दिन, एक कदम।",
  "dashboard.freshPage": "आज एक नया पन्ना",
  "dashboard.freshPageBody":
    "जागरूकता ही जीत है, और वह आगे साथ चलती है। अब तक का आपका सबसे लंबा सिलसिला है",
  "dashboard.longestStreak": "सबसे लंबा सिलसिला",
  "dashboard.alcoholFreeDays": "शराब-मुक्त दिन",
  "dashboard.mindfulCheckIns": "सजग चेक-इन",
  "dashboard.monthTotal": "{month} का कुल",
  "dashboard.weeklyVsGoal": "साप्ताहिक बनाम लक्ष्य",
  "dashboard.noGoal": "कोई लक्ष्य नहीं",
  "dashboard.thisMonth": "इस महीने",
  "dashboard.checkIns": "चेक-इन",
  "dashboard.recentActivity": "हाल की गतिविधि",
  "dashboard.recentActivityBody": "आपके पिछले चेक-इन एक नज़र में।",
  "dashboard.noRecords": "अभी कोई रिकॉर्ड नहीं। आपकी पहली एंट्री यहाँ दिखेगी।",
  "dashboard.loadFailed":
    "हम अभी आपका डेटा लोड नहीं कर सके — आपके रिकॉर्ड सुरक्षित हैं। कृपया अपना कनेक्शन जाँचें और पेज रिफ़्रेश करें।",

  // Craving SOS
  "sos.trigger": "मुझे अभी मुश्किल हो रही है",
  "sos.title": "आइए इसे साथ मिलकर पार करें",
  "sos.intro":
    "तलब उठती है, चरम पर पहुँचती है और गुज़र जाती है — आमतौर पर कुछ ही मिनटों में। आपको इससे लड़ना नहीं है, बस इसे बीत जाने देना है।",
  "sos.howStrong": "अभी यह कितनी तेज़ है?",
  "sos.scaleHint": "1 = हल्की · 5 = बहुत तेज़",
  "sos.start": "शुरू करें",
  "sos.riding": "लहर के साथ",
  "sos.breatheIn": "साँस लें",
  "sos.hold": "रोकें",
  "sos.breatheOut": "साँस छोड़ें",
  "sos.easeHint": "ज़्यादातर तलब लगभग पाँच मिनट में कम हो जाती है",
  "sos.talkItThrough": "बात करें",
  "sos.getHelpNow": "अभी मदद लें",
  "sos.done": "हो गया",
  "sos.outcomeTitle": "कैसा रहा?",
  "sos.outcomeBody": "यहाँ कोई गलत जवाब नहीं है। मदद के लिए हाथ बढ़ाना ही सबसे बड़ी बात है।",
  "sos.outcomePassed": "यह गुज़र गई — मैंने नहीं पी",
  "sos.outcomeDrank": "मैंने पी ली",
  "sos.outcomeUnresolved": "अब भी महसूस हो रही है",
  "sos.doneTitle": "इसमें हिम्मत लगती है",
  "sos.doneBody":
    "आपने अकेले जूझने के बजाय सहारा लिया — यही वह कौशल है जो आगे काम आता है। हर बार जब आप इसे पार करते हैं, अगली बार थोड़ा आसान हो जाता है।",
  "sos.close": "बंद करें",

  // Safety
  "safety.notMedicalTitle": "सहारा, चिकित्सा सलाह नहीं",
  "safety.notMedicalBody":
    "Recoverly आपको अपनी आदतों को समझने में मदद करता है — यह चिकित्सा उपचार नहीं है। यदि आप बहुत अधिक शराब पीते हैं, तो अचानक छोड़ना खतरनाक हो सकता है (विदड्रॉल से दौरे पड़ सकते हैं)। अपनी शराब की मात्रा में बड़ा बदलाव करने से पहले कृपया डॉक्टर से बात करें।",
  "safety.crisisTitle": "संकट में हैं या स्वयं को नुकसान पहुँचाने का विचार आ रहा है? मदद अभी उपलब्ध है",
  "safety.crisisIndia": "भारत",
  "safety.outsideIndia": "भारत के बाहर",
  "safety.findHelpline": "अपने क्षेत्र की हेल्पलाइन खोजें",
  "safety.emergency": "आपातकालीन सेवाएँ",
  "safety.withdrawalTitle": "शराब छोड़ने से पहले — कृपया पढ़ें",
  "safety.withdrawalBody":
    "यदि आप बहुत अधिक या रोज़ शराब पीते हैं, तो अचानक छोड़ना चिकित्सकीय रूप से खतरनाक हो सकता है — अचानक विदड्रॉल से दौरे या डेलिरियम ट्रेमेन्स हो सकते हैं, जो जानलेवा हो सकते हैं। छोड़ने से पहले कृपया डॉक्टर से बात करें, और केवल चिकित्सकीय निगरानी में ही मात्रा कम करें या बंद करें।",

  // Common actions
  "common.save": "सहेजें",
  "common.saving": "सहेजा जा रहा है…",
  "common.cancel": "रद्द करें",
  "common.close": "बंद करें",
  "common.loading": "लोड हो रहा है…",
  "common.tryAgain": "कृपया फिर से प्रयास करें।",
  "common.optional": "(वैकल्पिक)",
  "common.language": "भाषा"
};
