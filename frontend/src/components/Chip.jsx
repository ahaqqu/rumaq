import { cn } from '../lib/cn.js'

export function Chip({ variant = 'default', pressed = false, className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-pill text-xs font-medium px-3 py-1',
        variant === 'default' && 'bg-surface-inset text-text-muted',
        variant === 'loc' && 'bg-surface-raised border border-border text-text-muted',
        variant === 'filter' &&
          'min-h-9 px-4 py-2 text-sm bg-surface-raised border border-border-strong text-text-muted hover:bg-surface-sunken cursor-pointer select-none',
        variant === 'filter' &&
          pressed &&
          'bg-accent-soft border-accent-soft-border text-accent-hover',
        variant === 'accent' && 'bg-accent-soft text-accent-hover border border-accent-soft-border',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
