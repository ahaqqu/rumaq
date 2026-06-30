import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import id from './locales/id.json'

const LANG_KEY = 'rumaq:lang'

function loadLang() {
  try {
    return localStorage.getItem(LANG_KEY) || 'en'
  } catch {
    return 'en'
  }
}

function saveLang(lng) {
  try {
    localStorage.setItem(LANG_KEY, lng)
  } catch { /* noop */ }
}

i18n.use(initReactI18next).init({
  lng: loadLang(),
  fallbackLng: 'en',
  resources: { en: { translation: en }, id: { translation: id } },
  interpolation: { escapeValue: false },
  returnObjects: true,
})

i18n.on('languageChanged', (lng) => {
  saveLang(lng)
  document.documentElement.lang = lng
})

document.documentElement.lang = i18n.language

export default i18n
