import { createFileRoute } from '@tanstack/react-router'
import { useApp } from '../context/AppContext.jsx'
import { Settings } from '../pages/Settings.jsx'

function RouteComponent() {
  const { aiKey, setAiKey, motion, setMotion } = useApp()

  return (
    <Settings
      aiKey={aiKey}
      setAiKey={setAiKey}
      motion={motion}
      setMotion={setMotion}
    />
  )
}

export const Route = createFileRoute('/settings')({
  component: RouteComponent,
})
