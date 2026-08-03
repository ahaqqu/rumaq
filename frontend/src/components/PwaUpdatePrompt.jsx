import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './Button.jsx'

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW registered:', r)
    },
    onRegisterError(error) {
      console.log('SW registration error:', error)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] bg-surface-raised border border-border rounded-md px-5 py-3 flex gap-3 items-center shadow-lg">
      <span className="text-sm">Update available</span>
      <Button size="sm" onClick={() => updateServiceWorker(true)}>
        Update
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setNeedRefresh(false)}>
        Dismiss
      </Button>
    </div>
  )
}
