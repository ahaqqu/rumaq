import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useMatches, useNavigate } from '@tanstack/react-router'
import {
  IconHome,
  IconBox,
  IconPlan,
  IconHistory,
  IconSettings,
  IconReceipt,
  BrandMark,
} from './icons.jsx'
import { AI_USAGE, usageState } from '../data/mock.js'
import { useApp } from '../context/AppContext.jsx'
import { useMe, useLogout } from '../lib/queries/me.js'
import { useSettings } from '../lib/queries/index.js'
import { Assistant } from './Assistant.jsx'
import { OfflineBanner } from './OfflineBanner.jsx'

const NAV = [
  { id: 'home', key: 'nav.home', Icon: IconHome, to: '/' },
  { id: 'inventory', key: 'nav.inventory', Icon: IconBox, to: '/inventory' },
  { id: 'plan', key: 'nav.plan', Icon: IconPlan, to: '/plan' },
  { id: 'history', key: 'nav.history', Icon: IconHistory, to: '/history' },
  { id: 'settings', key: 'nav.settings', Icon: IconSettings, to: '/settings' },
]

export function AppShell({ children }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const matches = useMatches()
  const { aiKey, assistantOpen, setAssistantOpen } = useApp()
  const { data: me } = useMe()
  const { data: settings } = useSettings()
  const logout = useLogout()
  const [imgError, setImgError] = useState(false)

  const hasBackendKey = settings?.has_ai_key === true
  const isAiConnected = Boolean(aiKey) || hasBackendKey
  const { pct, warn, danger } = usageState()
  const usageTone = danger ? 'is-danger' : warn ? 'is-warn' : ''

  const currentRouteId = matches[matches.length - 1]?.routeId || '/'
  const currentNav = NAV.find((n) => n.to === currentRouteId)
  const title = currentNav ? t(currentNav.key) : t('nav.home')
  const isActive = (to) => matches.some((m) => m.routeId === to)

  const user = me?.user

  return (
    <div className="app">
      <aside className="rail" aria-label={t('nav.home')}>
        <div className="brand">
          <BrandMark size={32} />
          <div className="brand__name">RumaQ</div>
        </div>
        <Link to="/add" className="btn btn--primary btn--block rail__add">
          <IconReceipt size={18} /> {t('nav.addFromReceipt')}
        </Link>
        <nav className="nav">
          {NAV.map(({ id, key, Icon, to }) => (
            <Link
              key={id}
              to={to}
              className="nav__item"
              aria-current={isActive(to) ? 'page' : undefined}
            >
              <Icon size={18} /> {t(key)}
            </Link>
          ))}
        </nav>
        <div className="rail__foot">
          {user && (
            <div className="rail__user">
              {user.picture && !imgError ? (
                <img
                  className="rail__avatar"
                  src={user.picture}
                  alt=""
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="rail__avatar rail__avatar--initials">
                  {(user.name || '')
                    .split(' ')
                    .filter(Boolean)
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || (user.email || '?')[0].toUpperCase()}
                </div>
              )}
              <div className="rail__user-info">
                <div className="rail__user-name">{user.name || t('nav.settings')}</div>
                <button className="rail__logout" onClick={() => logout.mutate()}>
                  {t('nav.logout', 'Logout')}
                </button>
              </div>
            </div>
          )}
          <div className="rail__keystate">
            <span className={`rail__dot ${isAiConnected ? '' : 'is-off'}`} />
            {isAiConnected ? t('assistant.connected') : t('assistant.noKey')}
          </div>
          {isAiConnected && (
            <div className="rail__usage">
              <div className="rail__usage-row">
                <span className="rail__usage-label">
                  {t('common.requestsToday', {
                    used: AI_USAGE.used,
                    limit: AI_USAGE.limit,
                  })}
                </span>
                <span className={`rail__usage-count ${usageTone}`}>
                  {AI_USAGE.used}/{AI_USAGE.limit}
                </span>
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
        <OfflineBanner />
        <header className="topbar">
          <h1 className="topbar__title">{title}</h1>
          <div className="topbar__spacer" />
          <Link to="/add" className="topbar__btn" aria-label={t('nav.addFromReceipt')}>
            <IconReceipt size={18} />
          </Link>
          <Link to="/settings" className="topbar__btn" aria-label={t('nav.settings')}>
            <IconSettings size={18} />
          </Link>
        </header>

        <main className="page">{children}</main>
      </div>

      <nav className="bottombar" aria-label={t('nav.home')}>
        {NAV.filter((n) => n.id !== 'settings').map(({ id, key, Icon, to }) => (
          <Link
            key={id}
            to={to}
            className="bottombar__item"
            aria-current={isActive(to) ? 'page' : undefined}
          >
            <Icon size={20} /> {t(key)}
          </Link>
        ))}
        <Link
          to="/settings"
          className="bottombar__item"
          aria-current={isActive('/settings') ? 'page' : undefined}
        >
          <IconSettings size={20} /> {t('nav.settings')}
        </Link>
      </nav>

      <Assistant
        open={assistantOpen}
        onOpen={() => setAssistantOpen(true)}
        onClose={() => setAssistantOpen(false)}
        aiKey={aiKey}
        onNavigate={(view) => navigate({ to: `/${view === 'home' ? '' : view}` })}
      />
    </div>
  )
}
