import { cn } from '../lib/cn.js'
import { IconBox } from './icons.jsx'

export function EmptyState({ icon: Icon = IconBox, title, desc, action, className }) {
  return (
    <div className={cn('text-center px-6 py-12 text-text-muted', className)}>
      <div className="w-12 h-12 mx-auto mb-4 text-text-faint">
        <Icon size={48} />
      </div>
      <div className="font-semibold text-text text-base">{title}</div>
      <div className="text-sm mt-2 max-w-[44ch] mx-auto">{desc}</div>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
