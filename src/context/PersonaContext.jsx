import { createContext, useContext, useEffect, useState } from 'react'
import { loadPersona, savePersona, deriveHue, applyTheme, generatePersonaCopy } from '../lib/persona.js'

const PersonaContext = createContext(null)

export function PersonaProvider({ children }) {
  const [persona, setPersonaState] = useState(() => loadPersona())

  const setPersona = (next) => {
    setPersonaState((prev) => {
      const updated = {
        ...prev,
        ...next,
        hue: deriveHue(next.userRole ?? prev.userRole, next.aiRole ?? prev.aiRole),
      }
      savePersona(updated)
      return updated
    })
  }

  const regenerateCopy = async (aiKey, provider, draftPersona = persona) => {
    const generated = await generatePersonaCopy(draftPersona, aiKey, provider)
    if (generated) {
      setPersona({ generatedCopy: generated })
    }
    return generated
  }

  useEffect(() => {
    applyTheme(persona)
  }, [persona])

  return (
    <PersonaContext.Provider value={{ persona, setPersona, regenerateCopy }}>
      {children}
    </PersonaContext.Provider>
  )
}

export function usePersona() {
  const ctx = useContext(PersonaContext)
  if (!ctx) throw new Error('usePersona must be used inside PersonaProvider')
  return ctx
}
