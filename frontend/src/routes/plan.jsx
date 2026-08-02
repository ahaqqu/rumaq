import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useApp } from '../context/AppContext.jsx'
import { Plan } from '../pages/Plan.jsx'
import { RouteError } from '../components/RouteError.jsx'
import { RoutePending } from '../components/RoutePending.jsx'
import { queryClient } from '../lib/queryClient.js'
import { getPlans, getSettings } from '../lib/api.js'

function RouteComponent() {
  const navigate = useNavigate()
  const { setAssistantOpen } = useApp()

  return (
    <Plan
      askAssistant={() => setAssistantOpen(true)}
      setView={(view) => navigate({ to: `/${view === 'home' ? '' : view}` })}
    />
  )
}

export const Route = createFileRoute('/plan')({
  component: RouteComponent,
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  loader: async ({ signal }) => {
    await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ['plans', 'active'],
        queryFn: () => getPlans('active', signal),
        staleTime: 1000 * 60 * 5,
      }),
      queryClient.ensureQueryData({
        queryKey: ['settings'],
        queryFn: () => getSettings(signal),
        staleTime: 1000 * 60 * 5,
      }),
    ])
  },
})
