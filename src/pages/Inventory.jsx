import { useState, useMemo } from 'react'
import { STOCK, LOCATIONS, locLabel, relUpdated } from '../data/mock.js'
import { LocChip, TimeSignal, EmptyState } from '../components/ui.jsx'
import { usePersona } from '../context/PersonaContext.jsx'
import { personaText } from '../lib/persona.js'
import { IconSearch, IconBox, IconRefresh } from '../components/icons.jsx'

export default function Inventory() {
  const { persona } = usePersona()
  const [q, setQ] = useState('')
  const [loc, setLoc] = useState('all')

  const rows = useMemo(() => {
    return STOCK
      .filter((s) => (loc === 'all' ? true : s.location === loc))
      .filter((s) => s.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => a.runOut - b.runOut)
  }, [q, loc])

  return (
    <>
      <div className="page__head">
        <p className="page__lead">
          {personaText('inventoryLead', persona)}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', marginBottom: 'var(--sp-4)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <IconSearch size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-faint)' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari item, mis. susu, beras"
            aria-label="Cari item"
            style={{ paddingLeft: 40 }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', marginBottom: 'var(--sp-5)' }}>
        <button className="chip chip--filter" aria-pressed={loc === 'all'} onClick={() => setLoc('all')}>Semua</button>
        {LOCATIONS.map((l) => (
          <button key={l.id} className="chip chip--filter" aria-pressed={loc === l.id} onClick={() => setLoc(l.id)}>
            {l.label}
          </button>
        ))}
      </div>

      <div className="panel">
        {rows.length === 0 ? (
          <EmptyState
            icon={IconBox}
            title="Tidak ada item cocok"
            desc="Coba kata kunci lain atau ganti filter lokasi penyimpanan."
          />
        ) : (
          <div className="list">
            {rows.map((s) => (
              <div className="row" key={s.id}>
                <div className="row__main">
                  <div className="row__name">{s.name} <LocChip loc={locLabel(s.location)} /></div>
                  <div className="row__meta">
                    <TimeSignal expiryDays={s.expiryDays} runOut={s.runOut} basis={s.basis} />
                  </div>
                </div>
                <div className="row__side">
                  <div className="row__qty">{s.qty} {s.unit}</div>
                  <div className="row__updated"><IconRefresh size={12} /> Diperbarui {relUpdated(s.updated)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
