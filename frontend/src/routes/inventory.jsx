import { createFileRoute } from '@tanstack/react-router'
import Inventory from '../pages/Inventory.jsx'

export const Route = createFileRoute('/inventory')({
  component: Inventory,
})
