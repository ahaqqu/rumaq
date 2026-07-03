import { useTranslation } from 'react-i18next'
import { IconBox, IconPin, IconClock, IconShop } from './icons.jsx'
import { AI_USAGE, usageState } from '../data/mock.js'

export function LocChip({ loc }) {
  return <span className="chip chip--loc"><IconPin size={13} />{loc}</span>
}

export function TimeSignal({ expiryDays, runOut, basis }) {
  const { t } = useTranslation()
  const hasExpiry = expiryDays != null
  const useExpiry = hasExpiry && expiryDays <= runOut
  const title = basis ? t('ui.estimatedBy', { basis }) : undefined

  if (useExpiry) {
    if (expiryDays <= 1)
      return <span className="ts ts--danger" title={title}><IconClock size={13} /> {t('ui.expiringTomorrow')}</span>
    const tone = expiryDays <= 3 ? 'warn' : 'muted'
    return <span className={`ts ts--${tone}`} title={title}><IconClock size={13} /> {t('ui.expiringIn', { days: expiryDays })}</span>
  }

  const tone = runOut <= 2 ? 'danger' : runOut <= 3 ? 'warn' : 'muted'
  return <span className={`ts ts--${tone}`} title={title}><IconClock size={13} /> {t('ui.runsOutIn', { days: runOut })}</span>
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
  const { t } = useTranslation()
  const { pct, remaining, warn, danger } = usageState(usage)
  const tone = danger ? 'is-danger' : warn ? 'is-warn' : ''
  return (
    <div className="usage">
      <div className="usage__head">
        <div>
          <div className="usage__title">{usage.provider}</div>
          <div className="usage__sub">{t('ui.requestsToday', { used: usage.used, limit: usage.limit })}</div>
        </div>
        <div className={`usage__count ${tone}`}>{usage.used}/{usage.limit}</div>
      </div>
      <div className="usage__bar">
        <div className={`usage__fill ${tone}`} style={{ width: pct + '%' }} />
      </div>
      {danger ? (
        <div className="usage__note is-danger">{t('ui.dailyLimitReachedDesc')}</div>
      ) : warn ? (
        <div className="usage__note is-warn">{t('ui.closeToLimitDesc', { remaining })}</div>
      ) : (
        <div className="usage__note">{t('ui.remainingRequests', { remaining })}</div>
      )}
    </div>
  )
}

export function MetaItem({ icon: Icon, children }) {
  return <span><Icon size={13} />{children}</span>
}
export { IconPin, IconClock, IconShop }
