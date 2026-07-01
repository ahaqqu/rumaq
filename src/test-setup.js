import { vi } from 'vitest'

vi.mock('react-i18next', () => {
  const t = (key, opts) => {
    if (opts && opts.returnObjects) return {}
    if (opts && opts.defaultValue) return opts.defaultValue
    return key
  }
  return {
    useTranslation: () => ({ t, i18n: { language: 'en', changeLanguage: vi.fn(), on: vi.fn(), off: vi.fn() } }),
    I18nextProvider: ({ children }) => children,
    initReactI18next: { type: '3rdParty', init: vi.fn() },
  }
})

const mockPersona = {
  persona: { enabled: false, userRole: '', aiRole: '', hue: 230, generatedCopy: null },
  setPersona: vi.fn(),
  regenerateCopy: vi.fn(),
}

vi.mock('./context/PersonaContext.jsx', () => ({
  PersonaProvider: ({ children }) => children,
  usePersona: () => mockPersona,
}))
