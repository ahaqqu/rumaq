import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n/index.js'
import { LOCATIONS, STORES } from '../data/mock.js'
import { UsageMeter } from '../components/ui.jsx'
import { usePersona } from '../context/PersonaContext.jsx'
import { personaText, deriveHue } from '../lib/persona.js'
import { IconKey, IconCheck, IconTrash, IconPin, IconBolt } from '../components/icons.jsx'

const MOTION_OPTS = [
  { id: 'none', key: 'settings.motionOpts.none' },
  { id: 'reduced', key: 'settings.motionOpts.reduced' },
  { id: 'standard', key: 'settings.motionOpts.standard' },
]

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'id', label: 'Bahasa Indonesia' },
]

export default function Settings({ aiKey, setAiKey, motion, setMotion }) {
  const { t } = useTranslation()
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
  const [currentLang, setCurrentLang] = useState(i18n.language)

  useEffect(() => {
    const handler = (lng) => setCurrentLang(lng)
    i18n.on('languageChanged', handler)
    return () => i18n.off('languageChanged', handler)
  }, [])

  const applyPersona = async () => {
    setPersonaError(null)
    setPersonaLoading(true)
    try {
      setPersona({ ...personaDraft, generatedCopy: null })

      if (personaDraft.enabled && personaDraft.userRole && personaDraft.aiRole && aiKey) {
        await regenerateCopy(aiKey, provider, { ...personaDraft, hue: deriveHue(personaDraft.userRole, personaDraft.aiRole) })
      }

      setPersonaApplied(true)
      setTimeout(() => setPersonaApplied(false), 2000)
    } catch (err) {
      setPersonaError(err.message || 'Failed to generate persona text. Try again or use fallback without AI.')
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

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng)
  }

  return (
    <>
      <div className="page__head">
        <p className="page__lead">{personaText('settingsLead', persona, t)}</p>
      </div>

      <section className="section">
        <div className="section__head"><h2>{t('settings.aiApiKey')}</h2></div>
        <div className="panel">
          <div className="settings-group">
            <div className="setting">
              <div className="setting__main">
                <div className="setting__title">{t('settings.provider')}</div>
                <div className="setting__desc">{t('settings.providerDesc')}</div>
              </div>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} style={{ width: 'auto' }} aria-label={t('settings.aria.provider')}>
                <option value="opencode">OpenCode</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
            <div className="setting" style={{ flexWrap: 'wrap' }}>
              <div className="setting__main">
                <div className="setting__title">{t('settings.apiKey')}</div>
                <div className="setting__desc">{t('settings.apiKeyDesc')}</div>
              </div>
              <div className="key-input">
                <input
                  type="password"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t('settings.apiKeyPlaceholder')}
                  aria-label={t('settings.apiKey')}
                />
                <button className="btn btn--secondary btn--sm" onClick={test} disabled={!draft || testing}>
                  {testing ? <IconBolt size={15} className="spin" /> : <IconCheck size={15} />} {t('settings.test')}
                </button>
              </div>
            </div>
            {testOk && (
              <div className="setting" style={{ background: 'var(--ok-soft)' }}>
                <div className="setting__main">
                  <div className="setting__title" style={{ color: 'var(--ok)' }}>{t('settings.connectionSuccess')}</div>
                  <div className="setting__desc">{t('settings.connectionSuccessDesc')}</div>
                </div>
              </div>
            )}
            <div className="setting">
              <div className="setting__main">
                <div className="setting__title">{t('settings.status')}</div>
                <div className="setting__desc">
                  {aiKey ? t('settings.active') : t('settings.inactive')}
                </div>
              </div>
              <button className="btn btn--primary btn--sm" onClick={save}>
                {saved ? <><IconCheck size={15} /> {t('settings.saved')}</> : t('settings.saveKey')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__head"><h2>{t('settings.aiUsage')}</h2></div>
        <div className="panel">
          <UsageMeter />
        </div>
      </section>

      <section className="section">
        <div className="section__head"><h2>{t('settings.personalization')}</h2></div>
        <div className="panel">
          <div className="settings-group">
            <div className="setting" style={{ flexWrap: 'wrap' }}>
              <div className="setting__main" style={{ width: '100%', marginBottom: 'var(--sp-3)' }}>
                <div className="setting__title">{t('settings.iAm')}</div>
                <div className="setting__desc">
                  {t('settings.personalizationDesc')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', width: '100%' }}>
                <label style={{ flex: 1, minWidth: 160 }}>
                  <span className="sr-only">{t('settings.aria.myRole')}</span>
                  <input
                    value={personaDraft.userRole}
                    onChange={(e) => setPersonaDraft((p) => ({ ...p, userRole: e.target.value }))}
                    placeholder={t('settings.myRolePlaceholder')}
                    aria-label={t('settings.aria.myRole')}
                  />
                </label>
                <label style={{ flex: 1, minWidth: 160 }}>
                  <span className="sr-only">{t('settings.aria.aiRole')}</span>
                  <input
                    value={personaDraft.aiRole}
                    onChange={(e) => setPersonaDraft((p) => ({ ...p, aiRole: e.target.value }))}
                    placeholder={t('settings.aiRolePlaceholder')}
                    aria-label={t('settings.aria.aiRole')}
                  />
                </label>
                <button className="btn btn--primary btn--sm" onClick={applyPersona} disabled={personaLoading}>
                  {personaLoading ? <><IconBolt size={15} className="spin" /> {t('settings.loading')}</> : personaApplied ? <><IconCheck size={15} /> {t('settings.saved')}</> : t('settings.apply')}
                </button>
              </div>
            </div>
            <div className="setting">
              <div className="setting__main">
                <div className="setting__title">{t('settings.preview')}</div>
                <div className="setting__desc">
                  {persona.enabled && persona.userRole && persona.aiRole
                    ? personaText('homeLead', persona, t)
                    : t('settings.previewPlaceholder')}
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
                  {t('settings.enablePersona')}
                </label>
              </div>
            </div>
            <div className="setting">
              <div className="setting__main">
                <div className="setting__desc" style={{ fontSize: 'var(--fs-xs)' }}>
                  {aiKey
                    ? t('settings.personaInfoWithKey')
                    : t('settings.personaInfoNoKey')}
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

      <section className="section">
        <div className="section__head"><h2>{t('settings.storageLocations')}</h2></div>
        <div className="panel">
          <div className="settings-group">
            {locs.map((l) => (
              <div className="setting" key={l.id}>
                <div className="setting__main">
                  <div className="setting__title"><IconPin size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />{l.label}</div>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={() => removeLoc(l.id)} aria-label={t('settings.aria.deleteLocation', { name: l.label })}>
                  <IconTrash size={15} />
                </button>
              </div>
            ))}
            <div className="setting">
              <div className="setting__main">
                <div className="setting__title">{t('settings.addLocation')}</div>
                <div className="setting__desc">{t('settings.addLocationHint')}</div>
              </div>
              <div className="key-input">
                <input value={newLoc} onChange={(e) => setNewLoc(e.target.value)} placeholder={t('settings.locationName')} onKeyDown={(e) => e.key === 'Enter' && addLoc()} aria-label={t('settings.aria.newLocation')} />
                <button className="btn btn--secondary btn--sm" onClick={addLoc}>{t('settings.add')}</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__head"><h2>{t('settings.recordedStores')}</h2></div>
        <div className="panel" style={{ padding: 'var(--sp-4) var(--sp-5)', display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          {STORES.map((s) => <span className="chip chip--loc" key={s.id}>{s.label}</span>)}
        </div>
      </section>

      <section className="section">
        <div className="section__head"><h2>{t('settings.display')}</h2></div>
        <div className="panel">
          <div className="settings-group">
            <div className="setting">
              <div className="setting__main">
                <div className="setting__title">{t('settings.motion')}</div>
                <div className="setting__desc">{t('settings.motionDesc')}</div>
              </div>
              <div className="motion-scale" role="group" aria-label={t('settings.aria.motion')}>
                {MOTION_OPTS.map((m) => (
                  <button key={m.id} aria-pressed={motion === m.id} onClick={() => setMotion(m.id)}>{t(m.key)}</button>
                ))}
              </div>
            </div>
            <div className="setting">
              <div className="setting__main">
                <div className="setting__title">{t('settings.language')}</div>
                <div className="setting__desc">{t('settings.languageDesc')}</div>
              </div>
              <div className="motion-scale" role="group" aria-label={t('settings.language')}>
                {LANGUAGES.map((l) => (
                  <button key={l.code} aria-pressed={currentLang === l.code} onClick={() => changeLanguage(l.code)}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="setting">
              <div className="setting__main">
                <div className="setting__title">{t('settings.currency')}</div>
                <div className="setting__desc">{t('settings.currencyDesc')}</div>
              </div>
              <select defaultValue="idr" style={{ width: 'auto' }} aria-label={t('settings.aria.currency')}>
                <option value="idr">{t('settings.currencyOpts.idr')}</option>
                <option value="usd">{t('settings.currencyOpts.usd')}</option>
              </select>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
