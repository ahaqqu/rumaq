import { createFileRoute } from '@tanstack/react-router'
import { useApp } from '../context/AppContext.jsx'
import { History } from '../pages/History.jsx'
import { RouteError } from '../components/RouteError.jsx'
import { RoutePending } from '../components/RoutePending.jsx'
import { queryClient } from '../lib/queryClient.js'
import { getPurchases, getPurchasePatterns, getStores } from '../lib/api.js'

function RouteComponent() {
  const { setAssistantOpen } = useApp()

  return <History askAssistant={() => setAssistantOpen(true)} />
}

export const Route = createFileRoute('/history')({
  component: RouteComponent,
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  loader: async ({ signal }) => {
    await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ['purchases', {}],
        queryFn: () => getPurchases({}, signal),
        staleTime: 1000 * 60 * 5,
      }),
      queryClient.ensureQueryData({
        queryKey: ['purchasePatterns'],
        queryFn: () => getPurchasePatterns(signal),
        staleTime: 1000 * 60 * 5,
      }),
      queryClient.ensureQueryData({
        queryKey: ['stores'],
        queryFn: () => getStores(signal),
        staleTime: 1000 * 60 * 5,
      }),
    ])
  },
})
