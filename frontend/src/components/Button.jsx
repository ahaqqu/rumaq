import { cn } from '../lib/cn.js'

const variants = {
  primary:
    'bg-accent text-on-accent hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50 disabled:transform-none',
  secondary:
    'bg-surface-raised border border-border-strong text-text shadow-sm hover:bg-surface-sunken hover:border-accent-soft-border active:shadow-none disabled:opacity-50',
  ghost: 'text-text-muted hover:bg-surface-sunken hover:text-text disabled:opacity-50',
  danger:
    'bg-danger-soft border border-danger-border text-danger hover:bg-danger hover:text-on-accent hover:border-danger disabled:opacity-50',
}

const sizes = {
  default: 'min-h-11 px-5 py-3 text-base',
  sm: 'min-h-9 px-4 py-2 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'default',
  block = false,
  icon = false,
  children,
  className,
  ...props
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-pill font-semibold leading-none whitespace-nowrap transition-all duration-150',
        variants[variant],
        sizes[size],
        block && 'w-full',
        icon && 'p-2',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
