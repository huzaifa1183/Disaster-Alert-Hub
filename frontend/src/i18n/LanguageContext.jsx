import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { chatLanguages } from '../../../shared/chatLanguages.js'
import { siteMessages } from './siteMessages.js'

const STORAGE_KEY = 'dah-site-language'
const enabledCodes = new Set(Object.keys(siteMessages))
export const siteLanguages = chatLanguages.filter(({ code }) => enabledCodes.has(code))
const languageByCode = new Map(siteLanguages.map((language) => [language.code, language]))
const LanguageContext = createContext(null)

function getStoredLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return languageByCode.has(stored) ? stored : 'en'
  } catch (error) {
    console.warn('Unable to read the saved website language.', error)
    return 'en'
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getStoredLanguage)

  useEffect(() => {
    const selected = languageByCode.get(language) || languageByCode.get('en')
    document.documentElement.lang = selected.speechCode
    document.documentElement.dir = selected.direction
    try {
      localStorage.setItem(STORAGE_KEY, selected.code)
    } catch (error) {
      console.warn('Unable to save the website language preference.', error)
    }
  }, [language])

  const t = useCallback((key) => siteMessages[language]?.[key] || siteMessages.en[key] || key, [language])
  const locale = languageByCode.get(language)?.speechCode || 'en-IN'
  const value = useMemo(() => ({ language, locale, setLanguage, languages: siteLanguages, t }), [language, locale, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider.')
  return context
}
