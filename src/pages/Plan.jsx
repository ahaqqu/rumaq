import { useState } from 'react'
import { PLAN, formatRp, storeLabel } from '../data/mock.js'
import { SkeletonRows, EmptyState } from '../components/ui.jsx'
import { usePersona } from '../context/PersonaContext.jsx'
import { speak } from '../lib/persona.js'
import { IconSpark, IconShop, IconCheck, IconKey, IconPlan, IconBolt } from '../components/icons.jsx'

export default function Plan({ aiKey, askAssistant, setView }) {
  const { persona } = usePersona()
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState(aiKey ? PLAN : null)
  const [done, setDone] = useState({}) // planItemId -> true

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
          <p className="page__lead">{speak('Hubungkan kunci API dulu, lalu AI menyusun rencana belanja dari stok yang menipis.', persona)}</p>
        </div>
        <div className="panel">
          <EmptyState
            icon={IconKey}
            title="Hubungkan kunci API"
            desc="Bawa kunci AI sendiri, misalnya OpenCode. Setelah terhubung, tekan satu tombol untuk membuat rencana."
            action={<button className="btn btn--primary" onClick={() => setView('settings')}><IconKey size={18} /> Tambah kunci API</button>}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page__head">
        <p className="page__lead">
          {speak('AI mengelompokkan item per toko menjadi satu perjalanan. Centang yang sudah dibeli, sisanya otomatis tercatat.', persona)}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)', flexWrap: 'wrap' }}>
        <button className="btn btn--secondary" onClick={regenerate} disabled={loading}>
          <IconSpark size={18} /> Susun ulang rencana
        </button>
        {plan && (
          <div className="chip" style={{ alignSelf: 'center' }}>
            {plan.length} toko · {formatRp(grandTotal)}
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
            <div className="trip__total">{trip.items.length} item · {formatRp(tripTotal(trip.items))}</div>
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
            <strong>Semua item sudah dibeli.</strong> Stok diperbarui otomatis dari struk berikutnya.
          </div>
        </div>
      )}

      {!loading && plan && !allDone && (
        <div className="panel" style={{ padding: 'var(--sp-5)', display: 'flex', gap: 'var(--sp-4)', alignItems: 'center' }}>
          <div style={{ color: 'var(--accent)' }}><IconBolt size={20} /></div>
          <div style={{ flex: 1, fontSize: 'var(--fs-sm)' }}>
            Rencana ini disusun dari 5 item yang menipis. Minta asisten menggabungkan agar cukup satu perjalanan per toko.
          </div>
          <button className="btn btn--ghost btn--sm" onClick={askAssistant}>Tanya asisten</button>
        </div>
      )}
    </>
  )
}
