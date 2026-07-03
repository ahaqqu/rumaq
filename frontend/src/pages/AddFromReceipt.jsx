import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PARSED_RECEIPT, formatRp, storeLabel } from '../data/mock.js'
import { usePersona } from '../context/PersonaContext.jsx'
import { personaText } from '../lib/persona.js'
import { IconCamera, IconUpload, IconCheck, IconBolt, IconReceipt } from '../components/icons.jsx'

export default function AddFromReceipt({ onDone }) {
  const { t } = useTranslation()
  const { persona } = usePersona()
  const [phase, setPhase] = useState('capture')
  const [items, setItems] = useState(PARSED_RECEIPT.items)

  const scan = () => {
    setPhase('scanning')
    setTimeout(() => setPhase('review'), 1600)
  }

  const update = (id, field, value) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)))

  const lineTotal = items.reduce((a, b) => a + (Number(b.price) || 0), 0)

  return (
    <>
      <div className="page__head">
        <p className="page__lead">
          {personaText('receiptLead', persona, t)}
        </p>
      </div>

      {phase === 'capture' && (
        <div className="dropzone" role="button" tabIndex={0} onClick={scan} onKeyDown={(e) => e.key === 'Enter' && scan()}>
          <div className="dropzone__icon"><IconCamera size={26} /></div>
          <div className="dropzone__title">{t('addReceipt.takePhoto')}</div>
          <div className="dropzone__hint">{t('addReceipt.dropHint')}</div>
          <div style={{ marginTop: 'var(--sp-5)', display: 'flex', gap: 'var(--sp-3)', justifyContent: 'center' }}>
            <button className="btn btn--primary" onClick={scan}><IconCamera size={18} /> {t('addReceipt.openCamera')}</button>
            <button className="btn btn--secondary" onClick={scan}><IconUpload size={18} /> {t('addReceipt.uploadFile')}</button>
          </div>
        </div>
      )}

      {phase === 'scanning' && (
        <div className="panel" style={{ padding: 'var(--sp-9)', textAlign: 'center' }}>
          <div style={{ margin: '0 auto var(--sp-5)', color: 'var(--accent)' }}>
            <IconBolt size={32} className="spin" />
          </div>
          <div style={{ fontWeight: 600, fontSize: 'var(--fs-md)' }}>{t('addReceipt.scanningTitle')}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-2)' }}>
            {t('addReceipt.scanningDesc')}
          </div>
          <div style={{ maxWidth: 360, margin: 'var(--sp-5) auto 0' }}>
            <SkeletonLines />
          </div>
        </div>
      )}

      {phase === 'review' && (
        <>
          <div className="receipt-meta">
            <span className="chip chip--loc">{storeLabel(PARSED_RECEIPT.store)}</span>
            <span className="chip">{PARSED_RECEIPT.date}</span>
            <span className="chip">{t('addReceipt.itemsRead', { count: items.length })}</span>
            <span style={{ flex: 1 }} />
            <span className="chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent-hover)', border: '1px solid var(--accent-soft-border)' }}>
              {t('addReceipt.aiReview')}
            </span>
          </div>

          <div className="panel">
            <div className="panel__head">
              <h2>{t('addReceipt.reviewTitle')}</h2>
              <span className="hint">{t('addReceipt.editHint')}</span>
            </div>
            <div className="panel__body">
              {items.map((it) => (
                <div className="parsed-row" key={it.id}>
                  <input value={it.name} onChange={(e) => update(it.id, 'name', e.target.value)} aria-label={t('history.item')} />
                  <input value={it.qty} onChange={(e) => update(it.id, 'qty', e.target.value)} aria-label={t('common.from')} />
                  <input value={it.price} onChange={(e) => update(it.id, 'price', e.target.value)} aria-label={t('history.price')} />
                </div>
              ))}
            </div>
            <div className="panel__foot">
              <div style={{ marginRight: 'auto', color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
                {t('addReceipt.total')} <strong style={{ color: 'var(--text)' }}>{formatRp(lineTotal)}</strong>
              </div>
              <button className="btn btn--ghost" onClick={() => setPhase('capture')}>{t('addReceipt.retake')}</button>
              <button className="btn btn--primary" onClick={() => setPhase('done')}>
                <IconCheck size={18} /> {t('addReceipt.confirmAdd')}
              </button>
            </div>
          </div>
        </>
      )}

      {phase === 'done' && (
        <div className="panel" style={{ padding: 'var(--sp-9)', textAlign: 'center' }}>
          <div style={{ margin: '0 auto var(--sp-5)', color: 'var(--ok)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--ok-soft)', display: 'grid', placeItems: 'center', margin: '0 auto' }}>
              <IconCheck size={28} />
            </div>
          </div>
          <div style={{ fontWeight: 600, fontSize: 'var(--fs-lg)' }}>{t('addReceipt.stockAdded', { count: items.length })}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-2)' }}>
            {t('addReceipt.stockUpdatedDesc')}
          </div>
          <div style={{ marginTop: 'var(--sp-5)', display: 'flex', gap: 'var(--sp-3)', justifyContent: 'center' }}>
            <button className="btn btn--secondary" onClick={() => setPhase('capture')}><IconReceipt size={18} /> {t('addReceipt.addAnother')}</button>
            <button className="btn btn--primary" onClick={onDone}>{t('addReceipt.done')}</button>
          </div>
        </div>
      )}
    </>
  )
}

function SkeletonLines() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}>
          <div className="skeleton" style={{ height: 14, flex: 1 }} />
          <div className="skeleton" style={{ height: 14, width: 60 }} />
          <div className="skeleton" style={{ height: 14, width: 70 }} />
        </div>
      ))}
    </div>
  )
}
