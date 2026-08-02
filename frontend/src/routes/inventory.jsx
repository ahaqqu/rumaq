import { createFileRoute } from '@tanstack/react-router'
import { Inventory } from '../pages/Inventory.jsx'
import { RouteError } from '../components/RouteError.jsx'
import { RoutePending } from '../components/RoutePending.jsx'
import { queryClient } from '../lib/queryClient.js'
import { getStock, getLocations } from '../lib/api.js'

export const Route = createFileRoute('/inventory')({
  component: Inventory,
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  loader: async ({ signal }) => {
    await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ['stock', { location: undefined, q: undefined }],
        queryFn: () => getStock({}, signal),
        staleTime: 1000 * 60 * 5,
      }),
      queryClient.ensureQueryData({
        queryKey: ['locations'],
        queryFn: () => getLocations(signal),
        staleTime: 1000 * 60 * 5,
      }),
    ])
  },
})
