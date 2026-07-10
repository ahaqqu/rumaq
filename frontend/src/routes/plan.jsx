import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useApp } from '../context/AppContext.jsx'
import Plan from '../pages/Plan.jsx'

function RouteComponent() {
  const navigate = useNavigate()
  const { aiKey, setAssistantOpen } = useApp()

  return (
    <Plan
      aiKey={aiKey}
      askAssistant={() => setAssistantOpen(true)}
      setView={(view) => navigate({ to: `/${view === 'home' ? '' : view}` })}
    />
  )
}

export const Route = createFileRoute('/plan')({
  component: RouteComponent,
})
