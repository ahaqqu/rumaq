import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  IconSpark, IconClose, IconPlan, IconShop, IconLeaf, IconBolt, IconCheck, IconKey,
} from './icons.jsx'
import { formatRp, AI_USAGE, usageState } from '../data/mock.js'
import { usePersona } from '../context/PersonaContext.jsx'
import { personaText } from '../lib/persona.js'

const QUICK = [
  { id: 'plan', key: 'planThisWeek', descKey: 'planThisWeekDesc', Icon: IconPlan },
  { id: 'store', key: 'cheapestStore', descKey: 'cheapestStoreDesc', Icon: IconShop },
  { id: 'useup', key: 'useUpExpiring', descKey: 'useUpExpiringDesc', Icon: IconLeaf },
]

const PROPOSAL = {
  title: 'Rencana belanja, 3 toko dalam 1 hari',
  trips: [
    { store: 'Indomaret', items: ['Susu cair 1L · Rp18.500', 'Roti tawar · Rp15.000', 'Margarin · Rp14.000'], why: 'Hampir habis' },
    { store: 'Pasar', items: ['Telur 10pcs · Rp28.000', 'Bayam · Rp5.000'], why: 'Akan kedaluwarsa' },
  ],
  total: 80500,
}

export default function Assistant({ open, onOpen, onClose, aiKey, onNavigate }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [proposal, setProposal] = useState(null)
  const { warn, danger } = usageState()
  const { persona } = usePersona()

  const trigger = (id) => {
    if (!aiKey) return
    setBusy(true)
    setProposal(null)
    setTimeout(() => {
      setBusy(false)
      setProposal(PROPOSAL)
    }, 1100)
  }

  const accept = () => {
    onClose()
    setProposal(null)
    onNavigate('plan')
  }

  return (
    <>
      <button className="fab" onClick={() => (open ? onClose() : onOpen())}
        aria-label={t('assistant.fabAriaLabel')} aria-expanded={open}>
        <span className="fab__pulse" />
        <IconSpark size={20} />
        <span>{t('assistant.fabLabel')}</span>
      </button>

      {open && (
        <>
          <div className="scrim" onClick={onClose} />
          <section className="assistant" role="dialog" aria-label={t('assistant.dialogAriaLabel')}>
            <header className="assistant__head">
              <div className="assistant__avatar"><IconSpark size={18} /></div>
              <div>
                <div className="assistant__title">{t('assistant.title')}</div>
                <div className="assistant__status">
                  {aiKey ? (
                    <>
                      <span className={`rail__dot ${danger ? 'is-off' : warn ? 'is-warn' : ''}`} />
                      {danger ? t('assistant.dailyLimitReached') : t('assistant.ready', { used: AI_USAGE.used, limit: AI_USAGE.limit })}
                    </>
                  ) : t('assistant.notConnected')}
                </div>
              </div>
              <button className="assistant__close" onClick={onClose} aria-label={t('assistant.closeAriaLabel')}><IconClose size={18} /></button>
            </header>

            {!aiKey ? (
              <div className="assistant__keystate">
                <div className="empty__icon" style={{ margin: '0 auto var(--sp-4)' }}><IconKey size={40} /></div>
                <div className="empty__title">{t('assistant.connectKeyFirst')}</div>
                <div className="empty__desc">
                  {t('assistant.bringYourOwnKey')}
                </div>
                <button className="btn btn--primary btn--block" style={{ marginTop: 'var(--sp-5)' }}
                  onClick={() => { onClose(); onNavigate('settings') }}>
                  <IconKey size={18} /> {t('assistant.addApiKey')}
                </button>
              </div>
            ) : (
              <div className="assistant__body">
                <p className="assistant__msg">
                  {personaText('assistantGreeting', persona, t)}{' '}
                  <strong>{t('plan.stores', { count: 5 })}</strong> {t('plan.regenerate')}: 2 {t('home.expiring')}, 3 {t('home.nearlyOut')}. {personaText('assistantQuestion', persona, t)}
                </p>

                <div className="assistant__actions">
                  {QUICK.map(({ id, key, descKey, Icon }) => (
                    <button key={id} className="assistant__action" onClick={() => trigger(id)} disabled={busy}>
                      <Icon size={18} />
                      <span>
                        <div>{t(`assistant.${key}`)}</div>
                        <div className="why" style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>{t(`assistant.${descKey}`)}</div>
                      </span>
                    </button>
                  ))}
                </div>

                {busy && (
                  <div className="assistant__msg" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                    <IconBolt size={16} className="spin" style={{ color: 'var(--accent)' }} />
                    {t('assistant.analyzing')}
                  </div>
                )}

                {proposal && (
                  <div className="assistant__proposal">
                    <h4>{proposal.title}</h4>
                    <ul>
                      {proposal.trips.map((trip) => (
                        <li key={trip.store}>
                          <span><strong>{trip.store}</strong> — {trip.items.join(', ')}</span>
                          <span className="why">{trip.why}</span>
                        </li>
                      ))}
                    </ul>
                    <div style={{ marginTop: 'var(--sp-3)', fontWeight: 600 }}>
                      {t('assistant.totalEstimated', { amount: formatRp(proposal.total) })}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)' }}>
                      <button className="btn btn--primary btn--sm btn--block" onClick={accept}>
                        <IconCheck size={16} /> {t('assistant.applyToPlan')}
                      </button>
                      <button className="btn btn--secondary btn--sm" onClick={() => setProposal(null)}>{t('assistant.change')}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </>
  )
}
