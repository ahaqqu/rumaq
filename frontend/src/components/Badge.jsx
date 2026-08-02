import { cn } from '../lib/cn.js'

export function Badge({ tone = 'muted', className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold',
        tone === 'ok' && 'bg-ok-soft text-ok',
        tone === 'warn' && 'bg-warn-soft text-warn',
        tone === 'danger' && 'bg-danger-soft text-danger',
        tone === 'muted' && 'bg-surface-inset text-text-muted',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
