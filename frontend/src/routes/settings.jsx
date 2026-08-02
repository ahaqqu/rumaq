import { createFileRoute } from '@tanstack/react-router'
import { useApp } from '../context/AppContext.jsx'
import { Settings } from '../pages/Settings.jsx'
import { RouteError } from '../components/RouteError.jsx'
import { RoutePending } from '../components/RoutePending.jsx'
import { queryClient } from '../lib/queryClient.js'
import { getSettings, getLocations, getStores, getAiUsage } from '../lib/api.js'

function RouteComponent() {
  const { aiKey, setAiKey, motion, setMotion } = useApp()

  return <Settings aiKey={aiKey} setAiKey={setAiKey} motion={motion} setMotion={setMotion} />
}

export const Route = createFileRoute('/settings')({
  component: RouteComponent,
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  loader: async ({ signal }) => {
    await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ['settings'],
        queryFn: () => getSettings(signal),
        staleTime: 1000 * 60 * 5,
      }),
      queryClient.ensureQueryData({
        queryKey: ['locations'],
        queryFn: () => getLocations(signal),
        staleTime: 1000 * 60 * 5,
      }),
      queryClient.ensureQueryData({
        queryKey: ['stores'],
        queryFn: () => getStores(signal),
        staleTime: 1000 * 60 * 5,
      }),
      queryClient.ensureQueryData({
        queryKey: ['aiUsage'],
        queryFn: () => getAiUsage(signal),
        staleTime: 1000 * 60 * 5,
      }),
    ])
  },
})
