import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useApp } from '../context/AppContext.jsx'
import { Home } from '../pages/Home.jsx'
import { RouteError } from '../components/RouteError.jsx'
import { RoutePending } from '../components/RoutePending.jsx'
import { queryClient } from '../lib/queryClient.js'
import { getHome } from '../lib/api.js'

function RouteComponent() {
  const navigate = useNavigate()
  const { setAssistantOpen } = useApp()

  return (
    <Home
      setView={(view) => navigate({ to: `/${view === 'home' ? '' : view}` })}
      askAssistant={() => setAssistantOpen(true)}
    />
  )
}

export const Route = createFileRoute('/')({
  component: RouteComponent,
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  loader: async ({ signal }) => {
    await queryClient.ensureQueryData({
      queryKey: ['home'],
      queryFn: () => getHome(signal),
      staleTime: 1000 * 60 * 5,
    })
  },
})
