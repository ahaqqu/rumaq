import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n/index.js'
import {
  useSettingsQuery, useUpdateSettings,
  useLocationsQuery, useCreateLocation, useDeleteLocation,
  useStoresQuery, useCreateStore, useDeleteStore,
  useAiUsageQuery, useTestAiKey,
} from '../lib/hooks.js'
import { UsageMeter } from '../components/ui.jsx'
import { usePersona } from '../context/PersonaContext.jsx'
import { personaText, deriveHue } from '../lib/persona.js'
import { IconCheck, IconTrash, IconPin, IconBolt } from '../components/icons.jsx'

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
  const settings = useSettingsQuery()
  const updateSettings = useUpdateSettings()
  const locs = useLocationsQuery()
  const createLoc = useCreateLocation()
  const deleteLoc = useDeleteLocation()
  const stores = useStoresQuery()
  const createSt = useCreateStore()
  const deleteSt = useDeleteStore()
  const usage = useAiUsageQuery()
  const testKey = useTestAiKey()

  const [draft, setDraft] = useState(aiKey || '')
  const [provider, setProvider] = useState('gemini')
  const [saved, setSaved] = useState(false)
  const [testOk, setTestOk] = useState(null)
  const [newLoc, setNewLoc] = useState('')
  const [newStore, setNewStore] = useState('')
  const [currency, setCurrency] = useState('idr')
  const { persona, setPersona, regenerateCopy } = usePersona()
  const [personaDraft, setPersonaDraft] = useState({
    userRole: persona.userRole,
    aiRole: persona.aiRole,
    enabled: persona.enabled,
  })
  const [personaApplied, setPersonaApplied] = useState(false)
  const [personaError, setPersonaError] = useState(null)
  const [currentLang, setCurrentLang] = useState(i18n.language)

  const settingsData = settings.data
  useEffect(() => {
    if (settingsData) {
      setProvider(settingsData.ai_provider || 'gemini')
      setCurrency(settingsData.currency || 'idr')
      i18n.changeLanguage(settingsData.language || 'en')
      if (settingsData.persona) {
        const p = settingsData.persona
        setPersonaDraft({
          userRole: p.user_role || '',
          aiRole: p.ai_role || '',
          enabled: p.enabled,
        })
      }
    }
  }, [settingsData])

  useEffect(() => {
    const handler = (lng) => setCurrentLang(lng)
    i18n.on('languageChanged', handler)
    return () => i18n.off('languageChanged', handler)
  }, [])

  const applyPersona = async () => {
    setPersonaError(null)
    try {
      await updateSettings.mutateAsync({
        persona: {
          enabled: personaDraft.enabled,
          user_role: personaDraft.userRole,
          ai_role: personaDraft.aiRole,
        },
      })
      setPersona({ ...personaDraft, generatedCopy: null })

      if (personaDraft.enabled && personaDraft.userRole && personaDraft.aiRole && aiKey) {
        await regenerateCopy(aiKey, provider, { ...personaDraft, hue: deriveHue(personaDraft.userRole, personaDraft.aiRole) })
      }

      setPersonaApplied(true)
      setTimeout(() => setPersonaApplied(false), 2000)
    } catch (err) {
      setPersonaError(err.message || 'Failed to generate persona text. Try again or use fallback without AI.')
    }
  }

  const save = async () => {
    try {
      await updateSettings.mutateAsync({ ai_key: draft.trim() || undefined })
      setAiKey(draft.trim() || null)
      setSaved(true)
      setTestOk(null)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save key:', err)
    }
  }

  const test = async () => {
    setTestOk(null)
    try {
      await testKey.mutateAsync()
      setTestOk(true)
      settings.refetch()
    } catch {
      setTestOk(false)
    }
  }

  const addLoc = async () => {
    const v = newLoc.trim()
    if (!v) return
    try {
      await createLoc.mutateAsync(v)
      setNewLoc('')
    } catch (err) {
      console.error('Failed to add location:', err)
    }
  }

  const removeLoc = async (id) => {
    try {
      await deleteLoc.mutateAsync(id)
    } catch (err) {
      console.error('Failed to delete location:', err)
    }
  }

  const addStore = async () => {
    const v = newStore.trim()
    if (!v) return
    try {
      await createSt.mutateAsync(v)
      setNewStore('')
    } catch (err) {
      console.error('Failed to add store:', err)
    }
  }

  const removeStore = async (id) => {
    try {
      await deleteSt.mutateAsync(id)
    } catch (err) {
      console.error('Failed to delete store:', err)
    }
  }

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng)
  }

  const handleMotionChange = (val) => {
    setMotion(val)
    updateSettings.mutate({ motion_preference: val })
  }

  const handleCurrencyChange = (val) => {
    setCurrency(val)
    updateSettings.mutate({ currency: val })
  }

  if (settings.isLoading) {
    return <div className="page__head"><p className="page__lead">{t('common.loading')}</p></div>
  }

  return (
    <>
      <div className="page__head">
        <p className="page__lead">{personaText('settingsLead', persona, t)}</p>
      </div>

      <section className="mb-8">
        <div className="mb-4"><h2 className="text-lg font-semibold">{t('settings.aiApiKey')}</h2></div>
        <div className="rounded-xl border border-border bg-surface-raised overflow-hidden">
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border">
              <div className="min-w-0">
                <div className="font-medium">{t('settings.provider')}</div>
                <div className="text-sm text-text-muted mt-0.5">{t('settings.providerDesc')}</div>
              </div>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-auto" aria-label={t('settings.aria.provider')}>
                <option value="opencode">OpenCode</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border flex-wrap">
              <div className="min-w-0">
                <div className="font-medium">{t('settings.apiKey')}</div>
                <div className="text-sm text-text-muted mt-0.5">{t('settings.apiKeyDesc')}</div>
              </div>
              <div className="flex gap-2 max-w-[360px] w-full">
                <input
                  type="password"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t('settings.apiKeyPlaceholder')}
                  aria-label={t('settings.apiKey')}
                />
                <button className="btn btn--secondary btn--sm" onClick={test} disabled={!draft || testKey.isPending}>
                  {testKey.isPending ? <IconBolt size={15} className="animate-spin" /> : <IconCheck size={15} />} {t('settings.test')}
                </button>
              </div>
            </div>
            {testOk === true && (
              <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border bg-ok-soft">
                <div className="min-w-0">
                  <div className="font-medium text-ok">{t('settings.connectionSuccess')}</div>
                  <div className="text-sm text-text-muted mt-0.5">{t('settings.connectionSuccessDesc')}</div>
                </div>
              </div>
            )}
            {testOk === false && (
              <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border bg-danger-soft">
                <div className="min-w-0">
                  <div className="font-medium text-danger">{t('settings.connectionFailed')}</div>
                  <div className="text-sm text-text-muted mt-0.5">{t('settings.connectionFailedDesc')}</div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="font-medium">{t('settings.status')}</div>
                <div className="text-sm text-text-muted mt-0.5">
                  {settingsData?.ai_key_set ? t('settings.active') : t('settings.inactive')}
                </div>
              </div>
              <button className="btn btn--primary btn--sm" onClick={save} disabled={!draft || updateSettings.isPending}>
                {saved ? <><IconCheck size={15} /> {t('settings.saved')}</> : t('settings.saveKey')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-4"><h2 className="text-lg font-semibold">{t('settings.aiUsage')}</h2></div>
        <div className="rounded-xl border border-surface bg-surface-raised overflow-hidden">
          <UsageMeter usage={usage.data || { provider: '-', used: 0, limit: 20 }} />
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-4"><h2 className="text-lg font-semibold">{t('settings.personalization')}</h2></div>
        <div className="rounded-xl border border-surface bg-surface-raised overflow-hidden">
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border flex-wrap">
              <div className="min-w-0 w-full mb-3">
                <div className="font-medium">{t('settings.iAm')}</div>
                <div className="text-sm text-text-muted mt-0.5">{t('settings.personalizationDesc')}</div>
              </div>
              <div className="flex gap-3 flex-wrap w-full">
                <label className="flex-1 min-w-[160px]">
                  <span className="sr-only">{t('settings.aria.myRole')}</span>
                  <input
                    value={personaDraft.userRole}
                    onChange={(e) => setPersonaDraft((p) => ({ ...p, userRole: e.target.value }))}
                    placeholder={t('settings.myRolePlaceholder')}
                    aria-label={t('settings.aria.myRole')}
                  />
                </label>
                <label className="flex-1 min-w-[160px]">
                  <span className="sr-only">{t('settings.aria.aiRole')}</span>
                  <input
                    value={personaDraft.aiRole}
                    onChange={(e) => setPersonaDraft((p) => ({ ...p, aiRole: e.target.value }))}
                    placeholder={t('settings.aiRolePlaceholder')}
                    aria-label={t('settings.aria.aiRole')}
                  />
                </label>
                <button className="btn btn--primary btn--sm" onClick={applyPersona} disabled={updateSettings.isPending}>
                  {updateSettings.isPending ? <><IconBolt size={15} className="animate-spin" /> {t('settings.loading')}</> : personaApplied ? <><IconCheck size={15} /> {t('settings.saved')}</> : t('settings.apply')}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border">
              <div className="min-w-0">
                <div className="font-medium">{t('settings.preview')}</div>
                <div className="text-sm text-text-muted mt-0.5">
                  {persona.enabled && persona.userRole && persona.aiRole
                    ? personaText('homeLead', persona, t)
                    : t('settings.previewPlaceholder')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="persona-toggle"
                  type="checkbox"
                  checked={personaDraft.enabled}
                  onChange={(e) => setPersonaDraft((p) => ({ ...p, enabled: e.target.checked }))}
                  className="w-auto p-0 accent-[var(--color-accent)]"
                />
                <label htmlFor="persona-toggle" className="text-sm text-text-muted">{t('settings.enablePersona')}</label>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border">
              <div className="min-w-0">
                <div className="text-xs text-text-muted">
                  {aiKey ? t('settings.personaInfoWithKey') : t('settings.personaInfoNoKey')}
                </div>
              </div>
            </div>
            {personaError && (
              <div className="flex items-center justify-between gap-4 px-5 py-4 bg-danger-soft border border-danger-border">
                <div className="min-w-0">
                  <div className="text-sm text-danger">{personaError}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-4"><h2 className="text-lg font-semibold">{t('settings.storageLocations')}</h2></div>
        <div className="rounded-xl border border-surface bg-surface-raised overflow-hidden">
          <div className="flex flex-col">
            {(locs.data?.locations || []).map((l) => (
              <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border" key={l.id}>
                <div className="min-w-0">
                  <div className="font-medium"><IconPin size={14} className="inline -mt-0.5 mr-1.5" />{l.label}</div>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={() => removeLoc(l.id)} aria-label={t('settings.aria.deleteLocation', { name: l.label })}>
                  <IconTrash size={15} />
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="font-medium">{t('settings.addLocation')}</div>
                <div className="text-sm text-text-muted mt-0.5">{t('settings.addLocationHint')}</div>
              </div>
              <div className="flex gap-2 max-w-[360px] w-full">
                <input value={newLoc} onChange={(e) => setNewLoc(e.target.value)} placeholder={t('settings.locationName')} onKeyDown={(e) => e.key === 'Enter' && addLoc()} aria-label={t('settings.aria.newLocation')} />
                <button className="btn btn--secondary btn--sm" onClick={addLoc} disabled={createLoc.isPending}>{t('settings.add')}</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-4"><h2 className="text-lg font-semibold">{t('settings.recordedStores')}</h2></div>
        <div className="rounded-xl border border-surface bg-surface-raised overflow-hidden">
          <div className="flex flex-col">
            {(stores.data?.stores || []).map((s) => (
              <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border" key={s.id}>
                <div className="min-w-0">
                  <div className="font-medium"><IconPin size={14} className="inline -mt-0.5 mr-1.5" />{s.label}</div>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={() => removeStore(s.id)} aria-label={t('settings.aria.deleteStore', { name: s.label })}>
                  <IconTrash size={15} />
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="font-medium">{t('settings.addStore')}</div>
                <div className="text-sm text-text-muted mt-0.5">{t('settings.addStoreHint')}</div>
              </div>
              <div className="flex gap-2 max-w-[360px] w-full">
                <input value={newStore} onChange={(e) => setNewStore(e.target.value)} placeholder={t('settings.storeName')} onKeyDown={(e) => e.key === 'Enter' && addStore()} aria-label={t('settings.aria.newStore')} />
                <button className="btn btn--secondary btn--sm" onClick={addStore} disabled={createSt.isPending}>{t('settings.add')}</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-4"><h2 className="text-lg font-semibold">{t('settings.display')}</h2></div>
        <div className="rounded-xl border border-surface bg-surface-raised overflow-hidden">
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border">
              <div className="min-w-0">
                <div className="font-medium">{t('settings.motion')}</div>
                <div className="text-sm text-text-muted mt-0.5">{t('settings.motionDesc')}</div>
              </div>
              <div className="flex gap-1 bg-surface-inset rounded-full p-1" role="group" aria-label={t('settings.aria.motion')}>
                {MOTION_OPTS.map((m) => (
                  <button key={m.id} aria-pressed={motion === m.id} onClick={() => handleMotionChange(m.id)} className="px-4 py-2 rounded-full text-sm font-medium text-text-muted aria-pressed:bg-surface-raised aria-pressed:text-text aria-pressed:shadow-sm">
                    {t(m.key)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border">
              <div className="min-w-0">
                <div className="font-medium">{t('settings.language')}</div>
                <div className="text-sm text-text-muted mt-0.5">{t('settings.languageDesc')}</div>
              </div>
              <div className="flex gap-1 bg-surface-inset rounded-full p-1" role="group" aria-label={t('settings.language')}>
                {LANGUAGES.map((l) => (
                  <button key={l.code} aria-pressed={currentLang === l.code} onClick={() => changeLanguage(l.code)} className="px-4 py-2 rounded-full text-sm font-medium text-text-muted aria-pressed:bg-surface-raised aria-pressed:text-text aria-pressed:shadow-sm">
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="font-medium">{t('settings.currency')}</div>
                <div className="text-sm text-text-muted mt-0.5">{t('settings.currencyDesc')}</div>
              </div>
              <select value={currency} onChange={(e) => handleCurrencyChange(e.target.value)} className="w-auto" aria-label={t('settings.aria.currency')}>
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