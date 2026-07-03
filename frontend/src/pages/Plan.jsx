import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PLAN, formatRp, storeLabel } from '../data/mock.js'
import { SkeletonRows, EmptyState } from '../components/ui.jsx'
import { usePersona } from '../context/PersonaContext.jsx'
import { personaText } from '../lib/persona.js'
import { IconSpark, IconShop, IconCheck, IconKey, IconPlan, IconBolt } from '../components/icons.jsx'

export default function Plan({ aiKey, askAssistant, setView }) {
  const { t } = useTranslation()
  const { persona } = usePersona()
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState(aiKey ? PLAN : null)
  const [done, setDone] = useState({})

  const regenerate = () => {
    if (!aiKey) return
    setLoading(true)
    setPlan(null)
    setTimeout(() => { setLoading(false); setPlan(PLAN); setDone({}) }, 1300)
  }

  const tripTotal = (items) => items.reduce((a, b) => a + b.price, 0)
  const grandTotal = plan ? plan.reduce((a, t) => a + tripTotal(t.items), 0) : 0
  const allDone = plan && plan.every((t) => t.items.every((it) => done[it.id]))

  if (!aiKey) {
    return (
      <>
        <div className="page__head">
          <p className="page__lead">{personaText('planLeadNoKey', persona, t)}</p>
        </div>
        <div className="panel">
          <EmptyState
            icon={IconKey}
            title={t('plan.connectApiKey')}
            desc={t('plan.bringYourOwnKey')}
            action={<button className="btn btn--primary" onClick={() => setView('settings')}><IconKey size={18} /> {t('plan.addApiKey')}</button>}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page__head">
        <p className="page__lead">
          {personaText('planLead', persona, t)}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)', flexWrap: 'wrap' }}>
        <button className="btn btn--secondary" onClick={regenerate} disabled={loading}>
          <IconSpark size={18} /> {t('plan.regenerate')}
        </button>
        {plan && (
          <div className="chip" style={{ alignSelf: 'center' }}>
            {t('plan.stores', { count: plan.length })} · {formatRp(grandTotal)}
          </div>
        )}
      </div>

      {loading && (
        <div className="panel"><SkeletonRows n={4} /></div>
      )}

      {!loading && plan && plan.map((trip) => (
        <div className="trip" key={trip.store} style={{ marginBottom: 'var(--sp-4)' }}>
          <div className="trip__head">
            <div className="trip__store"><IconShop size={18} /> {storeLabel(trip.store)}</div>
            <div className="trip__total">{t('home.itemCount', { count: trip.items.length })} · {formatRp(tripTotal(trip.items))}</div>
          </div>
          <div className="trip__items">
            {trip.items.map((it) => (
              <label className={`plan-item ${done[it.id] ? 'is-done' : ''}`} key={it.id}>
                <input
                  type="checkbox"
                  className="plan-item__check"
                  checked={!!done[it.id]}
                  onChange={(e) => setDone((d) => ({ ...d, [it.id]: e.target.checked }))}
                />
                <div className="plan-item__main">
                  <div className="plan-item__name">{it.name} · {it.qty}</div>
                  <div className="plan-item__why">{it.why}</div>
                </div>
                <div className="plan-item__price">{formatRp(it.price)}</div>
              </label>
            ))}
          </div>
        </div>
      ))}

      {plan && allDone && (
        <div className="panel" style={{ padding: 'var(--sp-5)', display: 'flex', gap: 'var(--sp-4)', alignItems: 'center' }}>
          <div style={{ color: 'var(--ok)' }}><IconCheck size={22} /></div>
          <div style={{ flex: 1, fontSize: 'var(--fs-sm)' }}>
            <strong>{t('plan.allBought')}</strong> {t('plan.allBoughtDesc')}
          </div>
        </div>
      )}

      {!loading && plan && !allDone && (
        <div className="panel" style={{ padding: 'var(--sp-5)', display: 'flex', gap: 'var(--sp-4)', alignItems: 'center' }}>
          <div style={{ color: 'var(--accent)' }}><IconBolt size={20} /></div>
          <div style={{ flex: 1, fontSize: 'var(--fs-sm)' }}>
            {t('plan.basedOnItems', { count: 5 })}
          </div>
          <button className="btn btn--ghost btn--sm" onClick={askAssistant}>{t('plan.askAssistant')}</button>
        </div>
      )}
    </>
  )
}
