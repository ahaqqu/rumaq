import { SkeletonRows } from './Skeleton.jsx'
import { Panel } from './Panel.jsx'

export function RoutePending() {
  return (
    <Panel>
      <SkeletonRows n={4} />
    </Panel>
  )
}
