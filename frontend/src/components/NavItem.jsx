import { Link } from '@tanstack/react-router'
import { cn } from '../lib/cn.js'

export function NavItem({ to, active, mobile = false, children, ...props }) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center text-left w-full transition-colors duration-150',
        !mobile &&
          'gap-3 px-3 py-3 rounded-md text-base font-medium text-text-muted hover:bg-surface-sunken hover:text-text',
        !mobile && active && 'bg-accent-soft text-accent-hover',
        mobile &&
          'flex-1 flex-col items-center gap-0.5 py-2 px-2 text-xs font-medium text-text-faint rounded-md min-h-12',
        mobile && active && 'text-accent-hover'
      )}
      aria-current={active ? 'page' : undefined}
      {...props}
    >
      {children}
    </Link>
  )
}
