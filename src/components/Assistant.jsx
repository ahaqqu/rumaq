import { useState } from 'react'
import {
  IconSpark, IconClose, IconPlan, IconShop, IconLeaf, IconBolt, IconCheck, IconKey,
} from './icons.jsx'
import { formatRp, AI_USAGE, usageState } from '../data/mock.js'

const QUICK = [
  { id: 'plan', label: 'Susun rencana belanja minggu ini', desc: 'Dari stok menipis & riwayat', Icon: IconPlan },
  { id: 'store', label: 'Rekomendasikan toko termurah', desc: 'Berdasarkan riwayat harga', Icon: IconShop },
  { id: 'useup', label: 'Bantu habiskan yang kedaluwarsa', desc: 'Ide resep dari sisa stok', Icon: IconLeaf },
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
  const [busy, setBusy] = useState(false)
  const [proposal, setProposal] = useState(null)
  const { warn, danger } = usageState()

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
      {/* Persistent trigger — never more than one tap away */}
      <button className="fab" onClick={() => (open ? onClose() : onOpen())}
        aria-label="Tanya asisten AI" aria-expanded={open}>
        <span className="fab__pulse" />
        <IconSpark size={20} />
        <span>Tanya asisten</span>
      </button>

      {open && (
        <>
          <div className="scrim" onClick={onClose} />
          <section className="assistant" role="dialog" aria-label="Asisten AI RumaQ">
            <header className="assistant__head">
              <div className="assistant__avatar"><IconSpark size={18} /></div>
              <div>
                <div className="assistant__title">Asisten RumaQ</div>
                <div className="assistant__status">
                  {aiKey ? (
                    <>
                      <span className={`rail__dot ${danger ? 'is-off' : warn ? 'is-warn' : ''}`} />
                      {danger ? 'batas harian tercapai' : `siap membantu · ${AI_USAGE.used}/${AI_USAGE.limit} hari ini`}
                    </>
                  ) : 'belum terhubung'}
                </div>
              </div>
              <button className="assistant__close" onClick={onClose} aria-label="Tutup"><IconClose size={18} /></button>
            </header>

            {!aiKey ? (
              <div className="assistant__keystate">
                <div className="empty__icon" style={{ margin: '0 auto var(--sp-4)' }}><IconKey size={40} /></div>
                <div className="empty__title">Hubungkan kunci API dulu</div>
                <div className="empty__desc">
                  Bawa kunci AI sendiri, misalnya OpenCode, supaya RumaQ bisa menyusun rencana dan memberi rekomendasi.
                </div>
                <button className="btn btn--primary btn--block" style={{ marginTop: 'var(--sp-5)' }}
                  onClick={() => { onClose(); onNavigate('settings') }}>
                  <IconKey size={18} /> Tambah kunci API
                </button>
              </div>
            ) : (
              <div className="assistant__body">
                <p className="assistant__msg">
                  Saya sudah cek stokmu. <strong>5 item</strong> perlu perhatian: 2 mendekati kedaluwarsa, 3 hampir habis. Mau saya buatkan rencananya?
                </p>

                <div className="assistant__actions">
                  {QUICK.map(({ id, label, desc, Icon }) => (
                    <button key={id} className="assistant__action" onClick={() => trigger(id)} disabled={busy}>
                      <Icon size={18} />
                      <span>
                        <div>{label}</div>
                        <div className="why" style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>{desc}</div>
                      </span>
                    </button>
                  ))}
                </div>

                {busy && (
                  <div className="assistant__msg" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                    <IconBolt size={16} className="spin" style={{ color: 'var(--accent)' }} />
                    Menganalisis riwayat belanja dan stok…
                  </div>
                )}

                {proposal && (
                  <div className="assistant__proposal">
                    <h4>{proposal.title}</h4>
                    <ul>
                      {proposal.trips.map((t) => (
                        <li key={t.store}>
                          <span><strong>{t.store}</strong> — {t.items.join(', ')}</span>
                          <span className="why">{t.why}</span>
                        </li>
                      ))}
                    </ul>
                    <div style={{ marginTop: 'var(--sp-3)', fontWeight: 600 }}>
                      Total perkiraan: {formatRp(proposal.total)}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)' }}>
                      <button className="btn btn--primary btn--sm btn--block" onClick={accept}>
                        <IconCheck size={16} /> Terapkan ke rencana
                      </button>
                      <button className="btn btn--secondary btn--sm" onClick={() => setProposal(null)}>Ubah</button>
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
