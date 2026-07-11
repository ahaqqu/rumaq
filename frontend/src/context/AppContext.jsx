import { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [aiKey, setAiKey] = useState(null)
  const [motion, setMotion] = useState('standard')
  const [assistantOpen, setAssistantOpen] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.motion = motion
  }, [motion])

  return (
    <AppContext.Provider
      value={{
        aiKey,
        setAiKey,
        motion,
        setMotion,
        assistantOpen,
        setAssistantOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
