import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AddFromReceipt } from '../pages/AddFromReceipt.jsx'
import { RouteError } from '../components/RouteError.jsx'
import { RoutePending } from '../components/RoutePending.jsx'

function RouteComponent() {
  const navigate = useNavigate()

  return <AddFromReceipt onDone={() => navigate({ to: '/inventory' })} />
}

export const Route = createFileRoute('/add')({
  component: RouteComponent,
  pendingComponent: RoutePending,
  errorComponent: RouteError,
})
