import { useTranslation } from 'react-i18next'
import { usePlans, useGeneratePlan, useSavePlan, useUpdatePlanItem } from '../lib/queries/index.js'
import { useSettings } from '../lib/queries/index.js'
import { usePersona } from '../context/PersonaContext.jsx'
import { personaText } from '../lib/persona.js'
import { SkeletonRows, EmptyState } from '../components/ui.jsx'
import {
  IconSpark,
  IconShop,
  IconCheck,
  IconKey,
  IconBolt,
} from '../components/icons.jsx'

function formatPrice(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function Plan({ askAssistant, setView }) {
  const { t } = useTranslation()
  const { persona } = usePersona()
  const { data: settings, isLoading: settingsLoading } = useSettings()
  const { data: plansData, isLoading: plansLoading } = usePlans('active')
  const generateMutation = useGeneratePlan()
  const saveMutation = useSavePlan()
  const updateItemMutation = useUpdatePlanItem()

  const hasAiKey = settings?.has_ai_key === true

  const activePlan = plansData?.plans?.[0] ?? null
  const generatedItems = generateMutation.data?.items ?? null

  const allDone =
    activePlan &&
    activePlan.items.every((it) => it.status === 'bought' || it.status === 'skipped')

  const itemsByStore = (items) => {
    const map = {}
    for (const it of items) {
      const storeId = it.store_id || '__unknown__'
      if (!map[storeId]) {
        map[storeId] = { store_id: storeId, store_label: it.store_label || t('plan.otherStore'), items: [] }
      }
      map[storeId].items.push(it)
    }
    return Object.values(map)
  }

  const handleCheckItem = (planId, itemId, currentStatus) => {
    const newStatus = currentStatus === 'bought' ? 'pending' : 'bought'
    updateItemMutation.mutate({ planId, itemId, status: newStatus })
  }

  const handleGenerateAndSave = async () => {
    const result = await generateMutation.mutateAsync()
    const items = result.items.map((it) => ({
      name: it.name,
      qty: it.qty,
      unit: it.unit,
      store_id: it.store_id,
      price_estimate: it.price_estimate,
      why: it.why,
    }))
    await saveMutation.mutateAsync({ items })
  }

  if (settingsLoading || plansLoading) {
    return (
      <div className="panel">
        <SkeletonRows n={4} />
      </div>
    )
  }

  if (!hasAiKey) {
    return (
      <>
        <div className="page__head">
          <p className="page__lead">
            {personaText('planLeadNoKey', persona, t)}
          </p>
        </div>
        <div className="panel">
          <EmptyState
            icon={IconKey}
            title={t('plan.connectApiKey')}
            desc={t('plan.bringYourOwnKey')}
            action={
              <button
                className="btn btn--primary"
                onClick={() => setView('settings')}
              >
                <IconKey size={18} /> {t('plan.addApiKey')}
              </button>
            }
          />
        </div>
      </>
    )
  }

  if (generateMutation.isPending) {
    return (
      <>
        <div className="page__head">
          <p className="page__lead">{personaText('planLead', persona, t)}</p>
        </div>
        <div className="panel">
          <SkeletonRows n={4} />
        </div>
      </>
    )
  }

  if (generatedItems && !activePlan) {
    const stores = itemsByStore(generatedItems)
    const grandTotal = generatedItems.reduce((s, it) => s + (it.price_estimate || 0), 0)

    return (
      <>
        <div className="page__head">
          <p className="page__lead">{personaText('planLead', persona, t)}</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)', flexWrap: 'wrap' }}>
          <button
            className="btn btn--primary"
            onClick={handleGenerateAndSave}
            disabled={saveMutation.isPending}
          >
            <IconCheck size={18} /> {t('plan.savePlan')}
          </button>
          <button
            className="btn btn--secondary"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            <IconSpark size={18} /> {t('plan.regenerate')}
          </button>
          {grandTotal > 0 && (
            <div className="chip" style={{ alignSelf: 'center' }}>
              {t('plan.stores', { count: stores.length })} · {formatPrice(grandTotal)}
            </div>
          )}
        </div>
        {stores.map((store) => (
          <div className="trip" key={store.store_id} style={{ marginBottom: 'var(--sp-4)' }}>
            <div className="trip__head">
              <div className="trip__store">
                <IconShop size={18} /> {store.store_label}
              </div>
              <div className="trip__total">
                {t('home.itemCount', { count: store.items.length })} ·{' '}
                {formatPrice(store.items.reduce((s, it) => s + (it.price_estimate || 0), 0))}
              </div>
            </div>
            <div className="trip__items">
              {store.items.map((it) => (
                <div className="plan-item" key={it.name}>
                  <div className="plan-item__main">
                    <div className="plan-item__name">
                      {it.name} · {it.qty}{it.unit ? ` ${it.unit}` : ''}
                    </div>
                    <div className="plan-item__why">{it.why}</div>
                  </div>
                  {it.price_estimate != null && (
                    <div className="plan-item__price">{formatPrice(it.price_estimate)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </>
    )
  }

  if (!activePlan) {
    return (
      <>
        <div className="page__head">
          <p className="page__lead">{personaText('planLead', persona, t)}</p>
        </div>
        <div className="panel">
          <EmptyState
            icon={IconSpark}
            title={t('plan.noActivePlan')}
            desc={t('plan.generatePrompt')}
            action={
              <button
                className="btn btn--primary"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                <IconSpark size={18} /> {t('plan.generate')}
              </button>
            }
          />
        </div>
      </>
    )
  }

  const stores = itemsByStore(activePlan.items)
  const grandTotal = activePlan.items.reduce((s, it) => s + (it.price_estimate || 0), 0)

  return (
    <>
      <div className="page__head">
        <p className="page__lead">{personaText('planLead', persona, t)}</p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)', flexWrap: 'wrap' }}>
        <button
          className="btn btn--secondary"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
        >
          <IconSpark size={18} /> {t('plan.regenerate')}
        </button>
        {grandTotal > 0 && (
          <div className="chip" style={{ alignSelf: 'center' }}>
            {t('plan.stores', { count: stores.length })} · {formatPrice(grandTotal)}
          </div>
        )}
      </div>

      {stores.map((store) => (
        <div className="trip" key={store.store_id} style={{ marginBottom: 'var(--sp-4)' }}>
          <div className="trip__head">
            <div className="trip__store">
              <IconShop size={18} /> {store.store_label}
            </div>
            <div className="trip__total">
              {t('home.itemCount', { count: store.items.length })} ·{' '}
              {formatPrice(store.items.reduce((s, it) => s + (it.price_estimate || 0), 0))}
            </div>
          </div>
          <div className="trip__items">
            {store.items.map((it) => {
              const isDone = it.status === 'bought'
              const isSkipped = it.status === 'skipped'
              return (
                <label
                  className={`plan-item${isDone ? ' is-done' : ''}${isSkipped ? ' is-skipped' : ''}`}
                  key={it.id}
                >
                  <input
                    type="checkbox"
                    className="plan-item__check"
                    checked={isDone}
                    onChange={() => handleCheckItem(activePlan.id, it.id, it.status)}
                  />
                  <div className="plan-item__main">
                    <div className="plan-item__name">
                      {it.item_name || it.name} · {it.qty}{it.unit ? ` ${it.unit}` : ''}
                    </div>
                    {it.why && <div className="plan-item__why">{it.why}</div>}
                  </div>
                  {it.price_estimate != null && (
                    <div className="plan-item__price">{formatPrice(it.price_estimate)}</div>
                  )}
                </label>
              )
            })}
          </div>
        </div>
      ))}

      {allDone && (
        <div
          className="panel"
          style={{
            padding: 'var(--sp-5)',
            display: 'flex',
            gap: 'var(--sp-4)',
            alignItems: 'center',
          }}
        >
          <div style={{ color: 'var(--ok)' }}>
            <IconCheck size={22} />
          </div>
          <div style={{ flex: 1, fontSize: 'var(--fs-sm)' }}>
            <strong>{t('plan.allBought')}</strong> {t('plan.allBoughtDesc')}
          </div>
          <button
            className="btn btn--primary btn--sm"
            onClick={() => generateMutation.mutate()}
          >
            <IconSpark size={16} /> {t('plan.generateNext')}
          </button>
        </div>
      )}

      {!allDone && (
        <div
          className="panel"
          style={{
            padding: 'var(--sp-5)',
            display: 'flex',
            gap: 'var(--sp-4)',
            alignItems: 'center',
          }}
        >
          <div style={{ color: 'var(--accent)' }}>
            <IconBolt size={20} />
          </div>
          <div style={{ flex: 1, fontSize: 'var(--fs-sm)' }}>
            {t('plan.basedOnItems', { count: activePlan.items.length })}
          </div>
          <button className="btn btn--ghost btn--sm" onClick={askAssistant}>
            {t('plan.askAssistant')}
          </button>
        </div>
      )}
    </>
  )
}
