import { STOCK, PLAN, locLabel, storeLabel, formatRp, relUpdated } from '../data/mock.js'
import { LocChip, TimeSignal } from '../components/ui.jsx'
import { IconReceipt, IconSpark, IconLeaf, IconBox, IconRefresh } from '../components/icons.jsx'

export default function Home({ setView, askAssistant }) {
  const expiring = STOCK.filter((s) => s.expiryDays != null && s.expiryDays <= 2)
  const low = STOCK.filter((s) => s.runOut <= 3)
  const needs = [...expiring, ...low.filter((l) => !expiring.find((e) => e.id === l.id))]
  const stores = new Set(STOCK.map((s) => s.store))
  const nextTrip = PLAN[0]

  return (
    <>
      <div className="page__head">
        <p className="page__lead">
          Stok terpantau otomatis dari struk belanja. Sisa dihitung dari kebiasaanmu, bukan diisi manual.
        </p>
      </div>

      <div className="section__head" style={{ marginTop: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
        <h2>Status stok</h2>
      </div>
      <div className="stats">
        <div className="stat">
          <div className="stat__num">{STOCK.length}</div>
          <div className="stat__label">item terpantau</div>
        </div>
        <div className="stat">
          <div className="stat__num is-warn">{expiring.length}</div>
          <div className="stat__label">akan kedaluwarsa</div>
        </div>
        <div className="stat">
          <div className="stat__num is-warn">{low.length}</div>
          <div className="stat__label">hampir habis</div>
        </div>
        <div className="stat">
          <div className="stat__num">{stores.size}</div>
          <div className="stat__label">toko tercatat</div>
        </div>
      </div>

      <section className="section">
        <div className="section__head">
          <h2>Butuh perhatian</h2>
          <button className="btn btn--ghost btn--sm" onClick={() => setView('inventory')}>Lihat semua</button>
        </div>
        <div className="panel">
          {needs.length === 0 ? (
            <div className="empty">
              <div className="empty__icon"><IconBox size={40} /></div>
              <div className="empty__title">Semua aman</div>
              <div className="empty__desc">Tidak ada item yang kedaluwarsa atau habis dalam 3 hari.</div>
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
                    <div className="row__updated"><IconRefresh size={12} /> Diperbarui {relUpdated(s.updated)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>Usulan berikutnya</h2>
          <button className="btn btn--ghost btn--sm" onClick={askAssistant}><IconSpark size={15} /> Minta rencana</button>
        </div>
        <div className="tripcard">
          <div>
            <div className="tripcard__title">Belanja di {storeLabel(nextTrip.store)}</div>
            <div className="tripcard__sub">
              {nextTrip.items.length} item · perkiraan {formatRp(nextTrip.items.reduce((a, b) => a + b.price, 0))}
            </div>
            <div className="tripcard__items">
              {nextTrip.items.map((it) => (
                <span className="chip" key={it.id}>{it.name}</span>
              ))}
            </div>
          </div>
          <button className="btn btn--primary" onClick={() => setView('plan')}>Lihat rencana</button>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>Cara cepat isi stok</h2>
        </div>
        <div className="panel" style={{ padding: 'var(--sp-6)', display: 'flex', gap: 'var(--sp-5)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="dropzone__icon" style={{ margin: 0, width: 48, height: 48, borderRadius: 'var(--r-md)' }}><IconReceipt size={24} /></div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--fs-md)' }}>Foto struk, stok terisi otomatis</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-2)' }}>
              AI membaca item, harga, dan toko. Kamu cukup konfirmasi.
            </div>
          </div>
          <button className="btn btn--primary" onClick={() => setView('add')}>
            <IconReceipt size={18} /> Tambah dari struk
          </button>
        </div>
      </section>

      <section className="section">
        <div className="tiptip">
          <div className="tiptip__icon"><IconLeaf size={20} /></div>
          <div>
            <div className="tiptip__title">Saran hemat</div>
            <div className="tiptip__text">Bayam dan roti tawar kedaluwarsa besok. Minta asisten menyarankan resep untuk menghabiskannya.</div>
          </div>
          <button className="btn btn--primary btn--sm" onClick={askAssistant}><IconSpark size={15} /> Minta resep</button>
        </div>
      </section>
    </>
  )
}
