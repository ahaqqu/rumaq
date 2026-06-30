import { useTranslation } from 'react-i18next'
import { IconHome, IconBox, IconPlan, IconHistory, IconSettings, IconReceipt, BrandMark } from './icons.jsx'
import { AI_USAGE, usageState } from '../data/mock.js'
import Assistant from './Assistant.jsx'

const NAV = [
  { id: 'home', key: 'nav.home', Icon: IconHome },
  { id: 'inventory', key: 'nav.inventory', Icon: IconBox },
  { id: 'plan', key: 'nav.plan', Icon: IconPlan },
  { id: 'history', key: 'nav.history', Icon: IconHistory },
  { id: 'settings', key: 'nav.settings', Icon: IconSettings },
]

export default function AppShell({
  view, setView, title, aiKey, assistantOpen, setAssistantOpen, children,
}) {
  const { t } = useTranslation()
  const go = (id) => setView(id)
  const { pct, warn, danger } = usageState()
  const usageTone = danger ? 'is-danger' : warn ? 'is-warn' : ''

  return (
    <div className="app">
      <aside className="rail" aria-label={t('nav.home')}>
        <div className="brand">
          <BrandMark size={32} />
          <div className="brand__name">RumaQ</div>
        </div>
        <button className="btn btn--primary btn--block rail__add" onClick={() => go('add')}>
          <IconReceipt size={18} /> {t('nav.addFromReceipt')}
        </button>
        <nav className="nav">
          {NAV.map(({ id, key, Icon }) => (
            <button key={id} className="nav__item" aria-current={view === id ? 'page' : undefined}
              onClick={() => go(id)}>
              <Icon size={18} /> {t(key)}
            </button>
          ))}
        </nav>
        <div className="rail__foot">
          <div className="rail__keystate">
            <span className={`rail__dot ${aiKey ? '' : 'is-off'}`} />
            {aiKey ? t('assistant.connected') : t('assistant.noKey')}
          </div>
          {aiKey && (
            <div className="rail__usage">
              <div className="rail__usage-row">
                <span className="rail__usage-label">{t('common.requestsToday', { used: AI_USAGE.used, limit: AI_USAGE.limit })}</span>
                <span className={`rail__usage-count ${usageTone}`}>{AI_USAGE.used}/{AI_USAGE.limit}</span>
              </div>
              <div className="rail__mini-bar">
                <div className={`rail__mini-fill ${usageTone}`} style={{ width: pct + '%' }} />
              </div>
              {danger ? (
                <div className="rail__usage-note is-danger">{t('ui.dailyLimitReached')}</div>
              ) : warn ? (
                <div className="rail__usage-note is-warn">{t('assistant.closeToLimit')}</div>
              ) : null}
            </div>
          )}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1 className="topbar__title">{title}</h1>
          <div className="topbar__spacer" />
          <button className="topbar__btn" onClick={() => go('add')} aria-label={t('nav.addFromReceipt')}>
            <IconReceipt size={18} />
          </button>
          <button className="topbar__btn" onClick={() => setView('settings')} aria-label={t('nav.settings')}>
            <IconSettings size={18} />
          </button>
        </header>

        <main className="page">
          {children}
        </main>
      </div>

      <nav className="bottombar" aria-label={t('nav.home')}>
        {NAV.filter((n) => n.id !== 'settings').map(({ id, key, Icon }) => (
          <button key={id} className="bottombar__item" aria-current={view === id ? 'page' : undefined}
            onClick={() => go(id)}>
            <Icon size={20} /> {t(key)}
          </button>
        ))}
        <button className="bottombar__item" aria-current={view === 'settings' ? 'page' : undefined}
          onClick={() => go('settings')}>
          <IconSettings size={20} /> {t('nav.settings')}
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
