import { IconBox, IconPin, IconClock, IconShop } from './icons.jsx'
import { AI_USAGE, usageState } from '../data/mock.js'

export function LocChip({ loc }) {
  return <span className="chip chip--loc"><IconPin size={13} />{loc}</span>
}

// Single time signal per item. Shows whichever constraint binds first:
// expiry ("kedaluwarsa ...") or run-out ("habis ~..."). Basis moves to a tooltip
// so it stays accessible without crowding the row with three time facts.
export function TimeSignal({ expiryDays, runOut, basis }) {
  const hasExpiry = expiryDays != null
  const useExpiry = hasExpiry && expiryDays <= runOut
  const title = basis ? `Perkiraan berdasar ${basis}` : undefined

  if (useExpiry) {
    if (expiryDays <= 1)
      return <span className="ts ts--danger" title={title}><IconClock size={13} /> kedaluwarsa besok</span>
    const tone = expiryDays <= 3 ? 'warn' : 'muted'
    return <span className={`ts ts--${tone}`} title={title}><IconClock size={13} /> kedaluwarsa {expiryDays} hari lagi</span>
  }

  const tone = runOut <= 2 ? 'danger' : runOut <= 3 ? 'warn' : 'muted'
  return <span className={`ts ts--${tone}`} title={title}><IconClock size={13} /> habis ~{runOut} hari</span>
}

export function EmptyState({ icon: Icon = IconBox, title, desc, action }) {
  return (
    <div className="empty">
      <div className="empty__icon"><Icon size={40} /></div>
      <div className="empty__title">{title}</div>
      <div className="empty__desc">{desc}</div>
      {action && <div style={{ marginTop: 'var(--sp-5)' }}>{action}</div>}
    </div>
  )
}

export function SkeletonRows({ n = 5 }) {
  return (
    <div className="list">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="row" style={{ alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            <div className="skeleton" style={{ height: 14, width: '38%' }} />
            <div className="skeleton" style={{ height: 11, width: '62%' }} />
          </div>
          <div className="skeleton" style={{ height: 14, width: 60 }} />
        </div>
      ))}
    </div>
  )
}

export function UsageMeter({ usage = AI_USAGE }) {
  const { pct, remaining, warn, danger } = usageState(usage)
  const tone = danger ? 'is-danger' : warn ? 'is-warn' : ''
  return (
    <div className="usage">
      <div className="usage__head">
        <div>
          <div className="usage__title">{usage.provider}</div>
          <div className="usage__sub">{usage.used} dari {usage.limit} permintaan hari ini</div>
        </div>
        <div className={`usage__count ${tone}`}>{usage.used}/{usage.limit}</div>
      </div>
      <div className="usage__bar">
        <div className={`usage__fill ${tone}`} style={{ width: pct + '%' }} />
      </div>
      {danger ? (
        <div className="usage__note is-danger">Batas harian tercapai. AI tersedia lagi besok.</div>
      ) : warn ? (
        <div className="usage__note is-warn">Hampir mencapai batas harian. Sisa {remaining} permintaan.</div>
      ) : (
        <div className="usage__note">Sisa {remaining} permintaan hari ini.</div>
      )}
    </div>
  )
}

export function MetaItem({ icon: Icon, children }) {
  return <span><Icon size={13} />{children}</span>
}
export { IconPin, IconClock, IconShop }
