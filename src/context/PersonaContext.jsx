import { createContext, useContext, useEffect, useState } from 'react'
import { loadPersona, savePersona, deriveHue, applyTheme } from '../lib/persona.js'

const PersonaContext = createContext(null)

export function PersonaProvider({ children }) {
  const [persona, setPersonaState] = useState(() => loadPersona())

  const setPersona = (next) => {
    setPersonaState((prev) => {
      const updated = { ...prev, ...next, hue: deriveHue(next.userRole ?? prev.userRole, next.aiRole ?? prev.aiRole) }
      savePersona(updated)
      return updated
    })
  }

  useEffect(() => {
    applyTheme(persona)
  }, [persona])

  return (
    <PersonaContext.Provider value={{ persona, setPersona }}>
      {children}
    </PersonaContext.Provider>
  )
}

export function usePersona() {
  const ctx = useContext(PersonaContext)
  if (!ctx) throw new Error('usePersona must be used inside PersonaProvider')
  return ctx
}
