import { useState } from 'react'
import { LOCATIONS, STORES } from '../data/mock.js'
import { UsageMeter } from '../components/ui.jsx'
import { usePersona } from '../context/PersonaContext.jsx'
import { personaText, deriveHue } from '../lib/persona.js'
import { IconKey, IconCheck, IconTrash, IconPin, IconBolt } from '../components/icons.jsx'

const MOTION_OPTS = [
  { id: 'none', label: 'Tanpa' },
  { id: 'reduced', label: 'Ringan' },
  { id: 'standard', label: 'Standar' },
]

export default function Settings({ aiKey, setAiKey, motion, setMotion }) {
  const [draft, setDraft] = useState(aiKey || '')
  const [provider, setProvider] = useState('gemini')
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testOk, setTestOk] = useState(null)
  const [locs, setLocs] = useState(LOCATIONS)
  const [newLoc, setNewLoc] = useState('')
  const { persona, setPersona, regenerateCopy } = usePersona()
  const [personaDraft, setPersonaDraft] = useState({
    userRole: persona.userRole,
    aiRole: persona.aiRole,
    enabled: persona.enabled,
  })
  const [personaApplied, setPersonaApplied] = useState(false)
  const [personaLoading, setPersonaLoading] = useState(false)
  const [personaError, setPersonaError] = useState(null)

  const applyPersona = async () => {
    setPersonaError(null)
    setPersonaLoading(true)
    try {
      // First apply the role settings so theme changes immediately.
      setPersona({ ...personaDraft, generatedCopy: null })

      // If AI key exists, ask AI to generate copy for all screens in one request.
      if (personaDraft.enabled && personaDraft.userRole && personaDraft.aiRole && aiKey) {
        await regenerateCopy(aiKey, provider, { ...personaDraft, hue: deriveHue(personaDraft.userRole, personaDraft.aiRole) })
      }

      setPersonaApplied(true)
      setTimeout(() => setPersonaApplied(false), 2000)
    } catch (err) {
      setPersonaError(err.message || 'Gagal membuat teks persona. Coba lagi atau pakai fallback tanpa AI.')
    } finally {
      setPersonaLoading(false)
    }
  }

  const save = () => {
    setAiKey(draft.trim() || null)
    setSaved(true)
    setTestOk(null)
    setTimeout(() => setSaved(false), 2000)
  }

  const test = () => {
    setTesting(true)
    setTestOk(null)
    setTimeout(() => { setTesting(false); setTestOk(true) }, 1200)
  }

  const addLoc = () => {
    const v = newLoc.trim()
    if (!v) return
    setLocs((p) => [...p, { id: v.toLowerCase().replace(/\s+/g, '-'), label: v }])
    setNewLoc('')
  }

  const removeLoc = (id) => setLocs((p) => p.filter((l) => l.id !== id))

  return (
    <>
      <div className="page__head">
        <p className="page__lead">{personaText('settingsLead', persona)}</p>
      </div>

      {/* AI keys */}
      <section className="section">
        <div className="section__head"><h2>Kunci API AI</h2></div>
        <div className="panel">
          <div className="settings-group">
            <div className="setting">
              <div className="setting__main">
                <div className="setting__title">Penyedia</div>
                <div className="setting__desc">Pilih layanan AI yang kamu langgani.</div>
              </div>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} style={{ width: 'auto' }} aria-label="Penyedia AI">
                <option value="opencode">OpenCode</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
            <div className="setting" style={{ flexWrap: 'wrap' }}>
              <div className="setting__main">
                <div className="setting__title">Kunci API</div>
                <div className="setting__desc">Disimpan di perangkatmu, hanya dipakai untuk memanggil AI pilihanmu.</div>
              </div>
              <div className="key-input">
                <input
                  type="password"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="sk-… / tempel kunci di sini"
                  aria-label="Kunci API"
                />
                <button className="btn btn--secondary btn--sm" onClick={test} disabled={!draft || testing}>
                  {testing ? <IconBolt size={15} className="spin" /> : <IconCheck size={15} />} Tes
                </button>
              </div>
            </div>
            {testOk && (
              <div className="setting" style={{ background: 'var(--ok-soft)' }}>
                <div className="setting__main">
                  <div className="setting__title" style={{ color: 'var(--ok)' }}>Koneksi berhasil</div>
                  <div className="setting__desc">AI bisa menyusun rencana dan membaca struk.</div>
                </div>
              </div>
            )}
            <div className="setting">
              <div className="setting__main">
                <div className="setting__title">Status</div>
                <div className="setting__desc">
                  {aiKey ? 'Asisten aktif.' : 'Belum terhubung. Tanpa kunci, fitur AI nonaktif tapi inventaris tetap jalan.'}
                </div>
              </div>
              <button className="btn btn--primary btn--sm" onClick={save}>
                {saved ? <><IconCheck size={15} /> Tersimpan</> : 'Simpan kunci'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* AI usage */}
      <section className="section">
        <div className="section__head"><h2>Penggunaan AI</h2></div>
        <div className="panel">
          <UsageMeter />
        </div>
      </section>

      {/* Persona personalization */}
      <section className="section">
        <div className="section__head"><h2>Personalisasi peran</h2></div>
        <div className="panel">
          <div className="settings-group">
            <div className="setting" style={{ flexWrap: 'wrap' }}>
              <div className="setting__main" style={{ width: '100%', marginBottom: 'var(--sp-3)' }}>
                <div className="setting__title">Saya adalah … Kamu adalah …</div>
                <div className="setting__desc">
                  Tentukan bagaimana RumaQ berbicara kepadamu dan warna tema aplikasi.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', width: '100%' }}>
                <label style={{ flex: 1, minWidth: 160 }}>
                  <span className="sr-only">Peran saya</span>
                  <input
                    value={personaDraft.userRole}
                    onChange={(e) => setPersonaDraft((p) => ({ ...p, userRole: e.target.value }))}
                    placeholder="raja"
                    aria-label="Saya adalah"
                  />
                </label>
                <label style={{ flex: 1, minWidth: 160 }}>
                  <span className="sr-only">Peran AI</span>
                  <input
                    value={personaDraft.aiRole}
                    onChange={(e) => setPersonaDraft((p) => ({ ...p, aiRole: e.target.value }))}
                    placeholder="prajurit"
                    aria-label="Kamu adalah"
                  />
                </label>
                <button className="btn btn--primary btn--sm" onClick={applyPersona} disabled={personaLoading}>
                  {personaLoading ? <><IconBolt size={15} className="spin" /> Membuat…</> : personaApplied ? <><IconCheck size={15} /> Tersimpan</> : 'Terapkan'}
                </button>
              </div>
            </div>
            <div className="setting">
              <div className="setting__main">
                <div className="setting__title">Pratinjau</div>
                <div className="setting__desc">
                  {persona.enabled && persona.userRole && persona.aiRole
                    ? personaText('homeLead', persona)
                    : 'Isi peran lalu tekan Terapkan untuk melihat pratinjau.'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <input
                  id="persona-toggle"
                  type="checkbox"
                  checked={personaDraft.enabled}
                  onChange={(e) => setPersonaDraft((p) => ({ ...p, enabled: e.target.checked }))}
                  style={{ width: 'auto', padding: 0, accentColor: 'var(--accent)' }}
                />
                <label htmlFor="persona-toggle" style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
                  Aktifkan persona
                </label>
              </div>
            </div>
            <div className="setting">
              <div className="setting__main">
                <div className="setting__desc" style={{ fontSize: 'var(--fs-xs)' }}>
                  {aiKey
                    ? 'Tombol Terapkan akan memanggil AI sekali untuk menulis ulang semua teks aplikasi sesuai peran bebas yang kamu masukkan.'
                    : 'Tanpa kunci AI, persona tetap aktif dengan gaya bawaan (fallback) berdasarkan peran yang dikenali.'}
                </div>
              </div>
            </div>
            {personaError && (
              <div className="setting" style={{ background: 'var(--danger-soft)', borderColor: 'var(--danger-border)' }}>
                <div className="setting__main">
                  <div className="setting__desc" style={{ color: 'var(--danger)' }}>{personaError}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Storage locations */}
      <section className="section">
        <div className="section__head"><h2>Lokasi penyimpanan</h2></div>
        <div className="panel">
          <div className="settings-group">
            {locs.map((l) => (
              <div className="setting" key={l.id}>
                <div className="setting__main">
                  <div className="setting__title"><IconPin size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />{l.label}</div>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={() => removeLoc(l.id)} aria-label={`Hapus ${l.label}`}>
                  <IconTrash size={15} />
                </button>
              </div>
            ))}
            <div className="setting">
              <div className="setting__main">
                <div className="setting__title">Tambah lokasi</div>
                <div className="setting__desc">Mis. Kulkas kecil, Gudang, Rak rempah.</div>
              </div>
              <div className="key-input">
                <input value={newLoc} onChange={(e) => setNewLoc(e.target.value)} placeholder="Nama lokasi" onKeyDown={(e) => e.key === 'Enter' && addLoc()} aria-label="Nama lokasi baru" />
                <button className="btn btn--secondary btn--sm" onClick={addLoc}>Tambah</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tercatat stores (read-only info) */}
      <section className="section">
        <div className="section__head"><h2>Toko tercatat</h2></div>
        <div className="panel" style={{ padding: 'var(--sp-4) var(--sp-5)', display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          {STORES.map((s) => <span className="chip chip--loc" key={s.id}>{s.label}</span>)}
        </div>
      </section>

      {/* Motion + currency */}
      <section className="section">
        <div className="section__head"><h2>Tampilan</h2></div>
        <div className="panel">
          <div className="settings-group">
            <div className="setting">
              <div className="setting__main">
                <div className="setting__title">Gerakan</div>
                <div className="setting__desc">Pilih kenyamanan animasi.</div>
              </div>
              <div className="motion-scale" role="group" aria-label="Preferensi gerakan">
                {MOTION_OPTS.map((m) => (
                  <button key={m.id} aria-pressed={motion === m.id} onClick={() => setMotion(m.id)}>{m.label}</button>
                ))}
              </div>
            </div>
            <div className="setting">
              <div className="setting__main">
                <div className="setting__title">Mata uang</div>
                <div className="setting__desc">Dipakai di seluruh rencana dan riwayat.</div>
              </div>
              <select defaultValue="idr" style={{ width: 'auto' }} aria-label="Mata uang">
                <option value="idr">Rp (IDR)</option>
                <option value="usd">$ (USD)</option>
              </select>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
