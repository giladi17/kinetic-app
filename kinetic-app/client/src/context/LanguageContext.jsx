import { createContext, useContext, useState, useEffect } from 'react'
import { t } from '../i18n'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('kinetic_lang') || 'he')

  const changeLang = (newLang) => {
    setLang(newLang)
    localStorage.setItem('kinetic_lang', newLang)
    document.documentElement.dir = newLang === 'he' ? 'rtl' : 'ltr'
    document.documentElement.lang = newLang
  }

  useEffect(() => {
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [])

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t: (key) => t(lang, key) }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext)
