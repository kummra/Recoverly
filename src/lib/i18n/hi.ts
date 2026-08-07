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
    "जागरूकता ही जीत है, और वह आगे साथ चलती है। अब तक का आपका सबसे लंबा सिलसिला {days} रहा है।",
  "dashboard.dayUnit": "दिन",
  "dashboard.daysUnit": "दिन",
  "dashboard.welcome": "स्वागत है",
  "dashboard.welcomeBody": "आइए आपकी जगह तैयार करें — इसमें बस एक पल लगेगा।",
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
  "sos.intensityAria": "5 में से {n} तीव्रता",
  "sos.crisisPrefix": "संकट में हैं?",
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
  "home.greetingMorning": "सुप्रभात",
  "home.greetingAfternoon": "नमस्कार",
  "home.greetingEvening": "शुभ संध्या",
  "home.heroTitle": "आप एक {identity} बना रहे हैं।",
  "home.heroIdentity": "स्वस्थ पहचान",
  "home.heroBody":
    "यह ऐप आपको अपने पैटर्न पहचानने, चुनाव से पहले एक कोमल ठहराव बनाने, और शराब में हर सार्थक कमी का जश्न मनाने में मदद करता है।",
  "home.badgeProgress": "पूर्णता नहीं, प्रगति",
  "home.badgeCalm": "शांत निर्णय दीर्घकालिक स्वतंत्रता बनाते हैं",
  "home.logCheckIn": "चेक-इन दर्ज करें",
  "home.thisMonth": "इस महीने",
  "home.totalCheckIns": "कुल चेक-इन",
  "home.logged": "दर्ज",
  "home.quickActions": "त्वरित क्रियाएँ",
  "home.viewRecords": "रिकॉर्ड देखें",
  "home.talkToAi": "AI से बात करें",
  "home.todaysFocus": "आज का केंद्र",
  "home.quoteFooter": "हर दिन एक नया विचार, आपके संकल्प को सहारा देने के लिए।",
  "home.recoveryMindset": "रिकवरी की सोच",
  "home.ctaTitle": "अपनी रिकवरी यात्रा शुरू करें",
  "home.ctaBody":
    "मुफ़्त खाता बनाएँ — सेवन दर्ज करें, अंतर्दृष्टि देखें, और हमारे AI मार्गदर्शक से बात करें।",
  "home.getStarted": "शुरू करें",
  "home.quote1": "रोज़ दोहराए गए छोटे कदम ही आपकी सबसे मज़बूत पहचान बनते हैं।",
  "home.quote2": "रिकवरी पूर्णता की नहीं, दिशा की बात है।",
  "home.quote3": "हर ईमानदार चेक-इन इस बात का प्रमाण है कि आपको अपने भविष्य की परवाह है।",
  "home.quote4": "आज का सबसे साहसी काम है — ध्यान देना और कुछ अलग चुनना।",
  "home.quote5": "पैटर्न एक-एक सोचे-समझे ठहराव से बदलते हैं।",
  "home.quote6": "जिसे आप दर्ज करते हैं, उसे आप बदल देते हैं।",
  "home.quote7": "आपकी प्रतिबद्धता हर दर्ज प्रविष्टि में दिखती है।",

  "settings.title": "सेटिंग्स",
  "settings.subtitle": "अपना रिकवरी अनुभव अपने अनुसार बनाएँ.",
  "settings.profileTitle": "प्रोफ़ाइल और प्राथमिकताएँ",
  "settings.profileDesc": "अपने लक्ष्य व्यावहारिक और नियमित रखें।",
  "settings.account": "खाता",
  "settings.unknown": "अज्ञात",
  "settings.timezone": "समय क्षेत्र",
  "settings.yourWhy": "आपका कारण",
  "settings.yourWhyPlaceholder": "मेरा परिवार, मेरी सेहत, वह इंसान जो मैं बनना चाहता/चाहती हूँ…",
  "settings.yourWhyHint": "कठिन दिनों में आपका सहारा — आपके डैशबोर्ड पर दिखेगा।",
  "settings.displayName": "प्रदर्शित नाम",
  "settings.displayNamePlaceholder": "हम आपको क्या कहकर बुलाएँ?",
  "settings.weeklyGoal": "साप्ताहिक लक्ष्य (ml)",
  "settings.weeklyGoalHint": "ट्रैक करने के लिए साप्ताहिक सीमा तय करें। 0 का अर्थ है कोई सीमा नहीं।",
  "settings.reminderTime": "पसंदीदा रिमाइंडर समय",
  "settings.reminderHint":
    "इस समय के बाद, दिन में एक बार आपके डैशबोर्ड पर एक कोमल चेक-इन संकेत दिखेगा।",
  "settings.loadFailed":
    "आपकी मौजूदा प्राथमिकताएँ लोड नहीं हो सकीं। सहेजने से पहले पेज रिफ़्रेश करें, ताकि वे मिट न जाएँ।",
  "settings.saved": "प्राथमिकताएँ सफलतापूर्वक सहेजी गईं।",
  "settings.saveFailed": "प्राथमिकताएँ सहेजी नहीं जा सकीं। दोबारा कोशिश करें।",
  "settings.appSafety": "ऐप और सुरक्षा",
  "settings.appSafetyDesc": "इस ऐप को सहारे की तरह इस्तेमाल करें, चिकित्सा के विकल्प की तरह नहीं।",
  "settings.importantNotice": "महत्वपूर्ण सूचना",
  "settings.importantNoticeBody":
    "यह ऐप पेशेवर चिकित्सा सलाह का विकल्प नहीं है। यदि आप ख़ुद को ख़तरे में या आत्म-हानि के जोखिम में महसूस करें, तो कृपया तुरंत किसी भरोसेमंद पेशेवर या आपातकालीन सेवा से मदद लें।",
  "settings.privacyPolicy": "गोपनीयता नीति",
  "settings.termsOfUse": "उपयोग की शर्तें",
  "settings.languageDesc": "ऐप की भाषा चुनें। आपकी पसंद इसी डिवाइस पर याद रखी जाती है।",

  "notify.on": "रिमाइंडर चालू हैं।",
  "notify.onWithTime": "आपके चुने हुए समय पर आपको सूचना मिलेगी।",
  "notify.onNoTime": "इन्हें पाने के लिए ऊपर एक समय तय करें।",
  "notify.blocked":
    "इस साइट के लिए सूचनाएँ अवरुद्ध हैं। आप इन्हें अपने ब्राउज़र की साइट सेटिंग्स में फिर से चालू कर सकते हैं — ऐप के अंदर का रिमाइंडर वैसे भी काम करता रहेगा।",
  "notify.enable": "रिमाइंडर सूचनाएँ चालू करें",
  "notify.enableHint":
    "आपके चुने हुए समय पर दिन में एक कोमल सूचना भेजता है। Recoverly को होम स्क्रीन पर इंस्टॉल करने पर सबसे अच्छा काम करता है; पूरी तरह बंद ब्राउज़र में यह न आए।",

  "login.heroTitle": "{awareness} की ओर उठाया हर कदम सार्थक है।",
  "login.heroAwareness": "जागरूकता",
  "login.heroBody":
    "यहाँ आकर आप एक सार्थक चुनाव कर रहे हैं। यह प्लेटफ़ॉर्म आपकी यात्रा दर्ज करता है, ईमानदार अंतर्दृष्टि देता है, और सहानुभूतिपूर्ण AI मार्गदर्शन से आपका साथ देता है।",
  "login.privateTitle": "निजी और सुरक्षित",
  "login.privateBody": "आपका डेटा एन्क्रिप्टेड है और केवल आपको दिखता है।",
  "login.noJudgmentTitle": "कभी कोई निर्णय नहीं",
  "login.noJudgmentBody": "शर्मिंदगी नहीं, पहचान को मज़बूत करने पर आधारित।",
  "login.createAccount": "खाता बनाएँ",
  "login.welcomeBack": "वापसी पर स्वागत है",
  "login.phoneSignIn": "फ़ोन से साइन-इन",
  "login.createDesc": "कुछ ही पलों में अपना रिकवरी साथी तैयार करें।",
  "login.welcomeDesc": "आपकी यात्रा जारी है। जहाँ छोड़ा था वहीं से शुरू करने के लिए साइन इन करें।",
  "login.otpDesc": "आपके फ़ोन पर भेजा गया 6-अंकों का कोड दर्ज करें।",
  "login.smsDesc": "हम SMS से एक सत्यापन कोड भेजेंगे।",
  "login.tabEmail": "ईमेल",
  "login.tabPhone": "फ़ोन",
  "login.password": "पासवर्ड",
  "login.passwordPlaceholder": "कम से कम 6 अक्षर",
  "login.pleaseWait": "कृपया प्रतीक्षा करें…",
  "login.signIn": "साइन इन",
  "login.haveAccount": "पहले से खाता है? साइन इन करें",
  "login.newHere": "यहाँ नए हैं? खाता बनाएँ",
  "login.phoneNumber": "फ़ोन नंबर",
  "login.countryCodeHint": "देश कोड सहित लिखें (जैसे भारत के लिए +91)।",
  "login.sendingCode": "कोड भेजा जा रहा है…",
  "login.sendCode": "सत्यापन कोड भेजें",
  "login.verificationCode": "सत्यापन कोड",
  "login.codeSentTo": "{phone} पर कोड भेजा गया।",
  "login.verifying": "सत्यापित किया जा रहा है…",
  "login.verifyAndSignIn": "सत्यापित करें और साइन इन करें",
  "login.changePhone": "फ़ोन नंबर बदलें",
  "login.orContinue": "या इसके साथ जारी रखें",
  "login.googleSignIn": "Google से साइन इन करें",
  "login.authFailed": "प्रमाणीकरण विफल रहा। कृपया अपनी जानकारी जाँचें और दोबारा कोशिश करें।",
  "login.googleFailed": "Google साइन-इन विफल रहा। कृपया दोबारा कोशिश करें।",
  "login.sendFailed": "कोड नहीं भेजा जा सका। फ़ोन नंबर जाँचें और दोबारा कोशिश करें।",
  "login.invalidCode": "अमान्य कोड। कृपया जाँचें और दोबारा कोशिश करें।",

  "offline.title": "आप ऑफ़लाइन हैं",
  "offline.body":
    "आपके रिकॉर्ड लोड करने के लिए Recoverly को कनेक्शन चाहिए। आपने जो भी दर्ज किया है वह सुरक्षित है — कनेक्ट होते ही यहीं मिलेगा।",
  "offline.needHelp": "अभी मदद चाहिए?",
  "offline.worksOffline": "ये बिना इंटरनेट के भी काम करते हैं।",
  "error.title": "कुछ गड़बड़ हो गई",
  "error.body": "कृपया दोबारा कोशिश करें। यदि यह बार-बार हो, तो अपना कनेक्शन जाँचें और थोड़ी देर बाद प्रयास करें।",
  "error.retry": "फिर कोशिश करें",

  "common.emergency": "आपातकाल",
  "common.save": "सहेजें",
  "common.saving": "सहेजा जा रहा है…",
  "common.cancel": "रद्द करें",
  "common.close": "बंद करें",
  "common.loading": "लोड हो रहा है…",
  "common.tryAgain": "कृपया फिर से प्रयास करें।",
  "common.optional": "(वैकल्पिक)",
  "common.language": "भाषा"
};
