import { useTranslation } from 'react-i18next'
import { STOCK, PLAN, locLabel, storeLabel, formatRp, relUpdated } from '../data/mock.js'
import { LocChip, TimeSignal } from '../components/ui.jsx'
import { usePersona } from '../context/PersonaContext.jsx'
import { personaText } from '../lib/persona.js'
import { IconReceipt, IconSpark, IconLeaf, IconBox, IconRefresh } from '../components/icons.jsx'

export default function Home({ setView, askAssistant }) {
  const { t } = useTranslation()
  const { persona } = usePersona()
  const expiring = STOCK.filter((s) => s.expiryDays != null && s.expiryDays <= 2)
  const low = STOCK.filter((s) => s.runOut <= 3)
  const needs = [...expiring, ...low.filter((l) => !expiring.find((e) => e.id === l.id))]
  const stores = new Set(STOCK.map((s) => s.store))
  const nextTrip = PLAN[0]

  return (
    <>
      <div className="page__head">
        <p className="page__lead">
          {personaText('homeLead', persona, t)}
        </p>
      </div>

      <div className="section__head" style={{ marginTop: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
        <h2>{t('home.stockStatus')}</h2>
      </div>
      <div className="stats">
        <div className="stat">
          <div className="stat__num">{STOCK.length}</div>
          <div className="stat__label">{t('home.itemsMonitored')}</div>
        </div>
        <div className="stat">
          <div className="stat__num is-warn">{expiring.length}</div>
          <div className="stat__label">{t('home.expiring')}</div>
        </div>
        <div className="stat">
          <div className="stat__num is-warn">{low.length}</div>
          <div className="stat__label">{t('home.nearlyOut')}</div>
        </div>
        <div className="stat">
          <div className="stat__num">{stores.size}</div>
          <div className="stat__label">{t('home.storesRecorded')}</div>
        </div>
      </div>

      <section className="section">
        <div className="section__head">
          <h2>{t('home.needsAttention')}</h2>
          <button className="btn btn--ghost btn--sm" onClick={() => setView('inventory')}>{t('home.seeAll')}</button>
        </div>
        <div className="panel">
          {needs.length === 0 ? (
            <div className="empty">
              <div className="empty__icon"><IconBox size={40} /></div>
              <div className="empty__title">{t('home.allSafe')}</div>
              <div className="empty__desc">{t('home.allSafeDesc')}</div>
            </div>
          ) : (
            <div className="list">
              {needs.map((s) => (
                <div className="row" key={s.id}>
                  <div className="row__main">
                    <div className="row__name">{s.name} <LocChip loc={locLabel(s.location)} /></div>
                    <div className="row__meta">
                      <TimeSignal expiryDays={s.expiryDays} runOut={s.runOut} basis={s.basis} />
                    </div>
                  </div>
                  <div className="row__side">
                    <div className="row__qty">{s.qty} {s.unit}</div>
                    <div className="row__updated"><IconRefresh size={12} /> {t('common.updated')} {relUpdated(s.updated, t)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>{t('home.nextTrip')}</h2>
          <button className="btn btn--ghost btn--sm" onClick={askAssistant}><IconSpark size={15} /> {t('home.askPlan')}</button>
        </div>
        <div className="tripcard">
          <div>
            <div className="tripcard__title">{t('home.shopAt', { store: storeLabel(nextTrip.store) })}</div>
            <div className="tripcard__sub">
              {t('home.itemCount', { count: nextTrip.items.length })} · {t('home.estimated', { amount: formatRp(nextTrip.items.reduce((a, b) => a + b.price, 0)) })}
            </div>
            <div className="tripcard__items">
              {nextTrip.items.map((it) => (
                <span className="chip" key={it.id}>{it.name}</span>
              ))}
            </div>
          </div>
          <button className="btn btn--primary" onClick={() => setView('plan')}>{t('home.seePlan')}</button>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>{t('home.quickRefill')}</h2>
        </div>
        <div className="panel" style={{ padding: 'var(--sp-6)', display: 'flex', gap: 'var(--sp-5)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="dropzone__icon" style={{ margin: 0, width: 48, height: 48, borderRadius: 'var(--r-md)' }}><IconReceipt size={24} /></div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--fs-md)' }}>{t('home.quickRefillTitle')}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-2)' }}>
              {t('home.quickRefillDesc')}
            </div>
          </div>
          <button className="btn btn--primary" onClick={() => setView('add')}>
            <IconReceipt size={18} /> {t('home.addFromReceipt')}
          </button>
        </div>
      </section>

      <section className="section">
        <div className="tiptip">
          <div className="tiptip__icon"><IconLeaf size={20} /></div>
          <div>
            <div className="tiptip__title">{t('home.savingsTip')}</div>
            <div className="tiptip__text">{t('home.savingsTipText')}</div>
          </div>
          <button className="btn btn--primary btn--sm" onClick={askAssistant}><IconSpark size={15} /> {t('home.askRecipe')}</button>
        </div>
      </section>
    </>
  )
}
