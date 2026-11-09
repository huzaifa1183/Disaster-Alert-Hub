import { chatLanguageByCode } from '../../shared/chatLanguages.js'

const devanagariHints = [
  ['mr', ['मध्ये', 'काही', 'आहे का', 'करावे', 'पूरापासून', 'चक्रीवादळापासून', 'सध्याचे', 'आल्यावर', 'मला']],
  ['ne', ['तपाईं', 'गर्नु', 'गर्नुपर्छ', 'छैन', 'कृपया', 'लागि', 'हुन्छ']],
  ['sa', ['किं', 'कथम्', 'कर्तव्यम्', 'भवति', 'आपद्', 'अस्ति', 'संस्कृतम्']],
  ['mai', ['अहाँ', 'हमर', 'अछि', 'करब', 'मैथिली']],
  ['kok', ['कोंकणी', 'आसा', 'कशें', 'म्हाका', 'आनी']],
  ['ks', ['کश्मीरी', 'कश्मीरी', 'ژھ', 'چھُ']],
  ['brx', ['बड़ो', 'राव', 'बाथ्रा', 'बिदिन्थि']],
]

const scriptMatchers = [
  { code: 'ta', pattern: /[\u0B80-\u0BFF]/g },
  { code: 'te', pattern: /[\u0C00-\u0C7F]/g },
  { code: 'kn', pattern: /[\u0C80-\u0CFF]/g },
  { code: 'ml', pattern: /[\u0D00-\u0D7F]/g },
  { code: 'gu', pattern: /[\u0A80-\u0AFF]/g },
  { code: 'pa', pattern: /[\u0A00-\u0A7F]/g },
  { code: 'or', pattern: /[\u0B00-\u0B7F]/g },
  { code: 'sat', pattern: /[\u1C50-\u1C7F]/g },
  { code: 'mni', pattern: /[\uABC0-\uABFF]/g },
]

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length
}

export function detectLanguage(value = '') {
  const text = String(value).trim()
  if (!text) return { language: 'en', name: 'English', confidence: 0.2 }
  const lower = text.toLowerCase()
  const script = scriptMatchers.map((item) => ({ ...item, count: countMatches(text, item.pattern) })).sort((a, b) => b.count - a.count)[0]
  if (script?.count > 0) return { language: script.code, name: chatLanguageByCode[script.code].name, confidence: 0.98 }

  const olChiki = countMatches(text, /[\u1C50-\u1C7F]/g)
  if (olChiki) return { language: 'sat', name: 'Santali', confidence: 0.99 }
  const meitei = countMatches(text, /[\uABC0-\uABFF]/g)
  if (meitei) return { language: 'mni', name: 'Manipuri / Meitei', confidence: 0.99 }

  const arabicLetters = countMatches(text, /[\u0600-\u06FF]/g)
  if (arabicLetters) {
    const sindhi = /[ٺٿڄٻڱڳڪڻڙڏڌڦ]/.test(text)
    const kashmiri = /[ٲۍژ]/.test(text)
    const language = sindhi ? 'sd' : kashmiri ? 'ks' : 'ur'
    return { language, name: chatLanguageByCode[language].name, confidence: sindhi || kashmiri ? 0.87 : 0.78 }
  }

  const devanagari = countMatches(text, /[\u0900-\u097F]/g)
  if (devanagari) {
    for (const [language, hints] of devanagariHints) {
      if (hints.some((hint) => lower.includes(hint.toLowerCase()))) return { language, name: chatLanguageByCode[language].name, confidence: 0.78 }
    }
    return { language: 'hi', name: 'Hindi', confidence: 0.7 }
  }

  const bengaliScript = countMatches(text, /[\u0980-\u09FF]/g)
  if (bengaliScript) {
    const language = /[ৰৱ]/.test(text) || /অসমীয়া|অসমত|কৰিব|কেনেকৈ/.test(text) ? 'as' : 'bn'
    return { language, name: chatLanguageByCode[language].name, confidence: language === 'as' ? 0.82 : 0.76 }
  }

  const latin = countMatches(text, /[A-Za-z]/g)
  return { language: 'en', name: 'English', confidence: latin ? 0.72 : 0.25 }
}

const placeAliases = {
  Mumbai: ['मुंबई', 'मुंबईत', 'मुंबईमध्ये', 'মুম্বই', 'மும்பை', 'ముంబై', 'મુંબઈ', 'مُمبئی'],
  Maharashtra: ['महाराष्ट्र', 'महाराष्ट्रात', 'মহারাষ্ট্র', 'மகாராஷ்டிரா', 'మహారాష్ట్ర', 'મહારાષ્ટ્ર', 'مہاراشٹر'],
  Delhi: ['दिल्ली', 'দিল্লি', 'டெல்லி', 'ఢిల్లీ', 'દિલ્હી', 'دہلی'],
  Bengaluru: ['बेंगळुरू', 'ಬೆಂಗಳೂರು', 'பெங்களூரு', 'బెంగళూరు', 'બેંગલુરુ', 'بنگلور'],
  Chennai: ['चेन्नई', 'சென்னை', 'చెన్నై', 'ચેન્નાઈ', 'چنئی'],
  Kolkata: ['कोलकाता', 'কলকাতা', 'கொல்கத்தா', 'కోల్‌కతా', 'કોલકાતા', 'کلکتہ'],
  Assam: ['असम', 'অসম', 'அசாம்', 'అస్సాం', 'આસામ', 'آسام'],
  Guwahati: ['गुवाहाटी', 'গुवাহাটি', 'গুৱাহাটী', 'குவாஹட்டி', 'గువాహటి', 'گوہاٹی'],
  Jaipur: ['जयपुर', 'জয়পুর', 'ஜெய்ப்பூர்', 'జైపూర్', 'જયપુર'],
  Gujarat: ['गुजरात', 'ગુજરાત', 'குஜராத்', 'గుజరాత్', 'گجرات'],
  Odisha: ['ओडिशा', 'ଓଡ଼ିଶା', 'ஒடிசா', 'ఒడిశా', 'ઓડિશા'],
}

export function matchAlertPlace(alerts, message) {
  const normalized = String(message).toLocaleLowerCase()
  const matchingNames = new Set()
  for (const alert of alerts) {
    const names = [alert.city, alert.district, alert.state]
    for (const name of names) {
      const aliases = placeAliases[name] || []
      if (aliases.some((alias) => normalized.includes(alias.toLocaleLowerCase()))) matchingNames.add(name.toLocaleLowerCase())
    }
  }
  const matches = alerts.filter((alert) => [alert.city, alert.district, alert.state].some((name) => matchingNames.has(String(name).toLocaleLowerCase())))
  const query = [...new Set(matches.flatMap((alert) => [alert.city, alert.district, alert.state]).filter((name) => matchingNames.has(String(name).toLocaleLowerCase())))].join(', ')
  return matches.length || query ? { query, matches } : null
}