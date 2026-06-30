import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import AppShell from './components/AppShell.jsx'
import { PersonaProvider } from './context/PersonaContext.jsx'
import Home from './pages/Home.jsx'
import Inventory from './pages/Inventory.jsx'
import AddFromReceipt from './pages/AddFromReceipt.jsx'
import Plan from './pages/Plan.jsx'
import History from './pages/History.jsx'
import Settings from './pages/Settings.jsx'

const VIEWS = ['home', 'inventory', 'add', 'plan', 'history', 'settings']

export default function App() {
  const { t } = useTranslation()
  const [view, setView] = useState('home')
  const [aiKey, setAiKey] = useState(null)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [motion, setMotion] = useState('standard')

  useEffect(() => {
    document.documentElement.dataset.motion = motion
  }, [motion])

  const askAssistant = () => setAssistantOpen(true)
  const go = (v) => { setView(v); window.scrollTo(0, 0) }

  const navKey = VIEWS.includes(view) ? view : 'home'
  const meta = t(`nav.${navKey}`, { defaultValue: t('nav.home') })

  return (
    <PersonaProvider>
      <AppShell
        view={view}
        setView={go}
        title={meta}
        aiKey={aiKey}
        assistantOpen={assistantOpen}
        setAssistantOpen={setAssistantOpen}
      >
        {view === 'home' && <Home setView={go} askAssistant={askAssistant} />}
        {view === 'inventory' && <Inventory />}
        {view === 'add' && <AddFromReceipt onDone={() => go('inventory')} />}
        {view === 'plan' && <Plan aiKey={aiKey} askAssistant={askAssistant} setView={go} />}
        {view === 'history' && <History askAssistant={askAssistant} />}
        {view === 'settings' && <Settings aiKey={aiKey} setAiKey={setAiKey} motion={motion} setMotion={setMotion} />}
      </AppShell>
    </PersonaProvider>
  )
}
