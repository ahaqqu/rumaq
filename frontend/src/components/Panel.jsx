import { cn } from '../lib/cn.js'

export function Panel({ className, children, ...props }) {
  return (
    <div
      className={cn('bg-surface-raised border border-border rounded-lg overflow-hidden', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function PanelHead({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-5 py-4 border-b border-border',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function PanelBody({ className, children, ...props }) {
  return (
    <div className={cn('px-5 py-4', className)} {...props}>
      {children}
    </div>
  )
}

export function PanelFoot({ className, children, ...props }) {
  return (
    <div
      className={cn('flex justify-end gap-3 px-5 py-3 border-t border-border', className)}
      {...props}
    >
      {children}
    </div>
  )
}
