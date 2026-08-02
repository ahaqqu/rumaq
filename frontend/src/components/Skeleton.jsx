import { cn } from '../lib/cn.js'

export function Skeleton({ className, style, ...props }) {
  return (
    <div
      className={cn(
        'bg-surface-inset rounded-sm relative overflow-hidden',
        'after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-surface-raised/60 after:to-transparent after:animate-[shimmer_1.4s_infinite]',
        className
      )}
      style={style}
      {...props}
    />
  )
}

export function SkeletonLines({ n = 4 }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center">
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-[60px]" />
          <Skeleton className="h-3.5 w-[70px]" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonRows({ n = 5 }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 border-b border-border last:border-b-0"
        >
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="h-3.5 w-[38%]" />
            <Skeleton className="h-[11px] w-[62%]" />
          </div>
          <Skeleton className="h-3.5 w-[60px]" />
        </div>
      ))}
    </div>
  )
}
