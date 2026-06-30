import { IconHome, IconBox, IconPlan, IconHistory, IconSettings, IconReceipt, BrandMark } from './icons.jsx'
import { AI_USAGE, usageState } from '../data/mock.js'
import Assistant from './Assistant.jsx'

const NAV = [
  { id: 'home', label: 'Beranda', Icon: IconHome },
  { id: 'inventory', label: 'Inventaris', Icon: IconBox },
  { id: 'plan', label: 'Rencana belanja', Icon: IconPlan },
  { id: 'history', label: 'Riwayat', Icon: IconHistory },
  { id: 'settings', label: 'Pengaturan', Icon: IconSettings },
]

export default function AppShell({
  view, setView, title, aiKey, assistantOpen, setAssistantOpen, children,
}) {
  const go = (id) => setView(id)
  const { pct, warn, danger } = usageState()
  const usageTone = danger ? 'is-danger' : warn ? 'is-warn' : ''

  return (
    <div className="app">
      {/* Desktop rail */}
      <aside className="rail" aria-label="Navigasi utama">
        <div className="brand">
          <BrandMark size={32} />
          <div className="brand__name">RumaQ</div>
        </div>
        <button className="btn btn--primary btn--block rail__add" onClick={() => go('add')}>
          <IconReceipt size={18} /> Tambah dari struk
        </button>
        <nav className="nav">
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} className="nav__item" aria-current={view === id ? 'page' : undefined}
              onClick={() => go(id)}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
        <div className="rail__foot">
          <div className="rail__keystate">
            <span className={`rail__dot ${aiKey ? '' : 'is-off'}`} />
            {aiKey ? 'Asisten AI terhubung' : 'Belum ada kunci AI'}
          </div>
          {aiKey && (
            <div className="rail__usage">
              <div className="rail__usage-row">
                <span className="rail__usage-label">AI hari ini</span>
                <span className={`rail__usage-count ${usageTone}`}>{AI_USAGE.used}/{AI_USAGE.limit}</span>
              </div>
              <div className="rail__mini-bar">
                <div className={`rail__mini-fill ${usageTone}`} style={{ width: pct + '%' }} />
              </div>
              {danger ? (
                <div className="rail__usage-note is-danger">Batas harian tercapai</div>
              ) : warn ? (
                <div className="rail__usage-note is-warn">Hampir habis</div>
              ) : null}
            </div>
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="main">
        <header className="topbar">
          <h1 className="topbar__title">{title}</h1>
          <div className="topbar__spacer" />
          <button className="topbar__btn" onClick={() => go('add')} aria-label="Tambah dari struk">
            <IconReceipt size={18} />
          </button>
          <button className="topbar__btn" onClick={() => setView('settings')} aria-label="Pengaturan">
            <IconSettings size={18} />
          </button>
        </header>

        <main className="page">
          {children}
        </main>
      </div>

      {/* Mobile bottom bar */}
      <nav className="bottombar" aria-label="Navigasi">
        {NAV.filter((n) => n.id !== 'settings').map(({ id, label, Icon }) => (
          <button key={id} className="bottombar__item" aria-current={view === id ? 'page' : undefined}
            onClick={() => go(id)}>
            <Icon size={20} /> {label}
          </button>
        ))}
        <button className="bottombar__item" aria-current={view === 'settings' ? 'page' : undefined}
          onClick={() => go('settings')}>
          <IconSettings size={20} /> Pengaturan
        </button>
      </nav>

      <Assistant
        open={assistantOpen}
        onOpen={() => setAssistantOpen(true)}
        onClose={() => setAssistantOpen(false)}
        aiKey={aiKey}
        onNavigate={setView}
      />
    </div>
  )
}
