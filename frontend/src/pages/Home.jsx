import { useTranslation } from 'react-i18next'
import { TimeSignal, SkeletonRows } from '../components/ui.jsx'
import { useHome } from '../lib/queries/index.js'
import { usePersona } from '../context/PersonaContext.jsx'
import { personaText } from '../lib/persona.js'
import { IconReceipt, IconSpark, IconLeaf, IconBox } from '../components/icons.jsx'
import { cn } from '../lib/cn.js'
import { Button } from '../components/Button.jsx'
import { Chip } from '../components/Chip.jsx'
import { Panel } from '../components/Panel.jsx'

function getDaysUntil(expiryDate) {
  if (!expiryDate) return null
  const now = new Date()
  const expiry = new Date(expiryDate + 'T00:00:00')
  return Math.round((expiry - now) / 86400000)
}

export function Home({ setView, askAssistant }) {
  const { t } = useTranslation()
  const { persona } = usePersona()
  const { data, isLoading } = useHome()

  if (isLoading) {
    return (
      <Panel>
        <SkeletonRows n={4} />
      </Panel>
    )
  }

  const totalItems = data?.total_items ?? 0
  const expiring7d = data?.expiring_7d ?? 0
  const runningOut7d = data?.running_out_7d ?? 0
  const needs = data?.low_stock ?? []
  const nextTrip = data?.next_trip

  return (
    <>
      <div className="mb-6">
        <p className="text-md text-text-muted leading-snug max-w-[62ch]">
          {personaText('homeLead', persona, t)}
        </p>
      </div>

      <div className="flex items-baseline justify-between gap-4 mb-4 mt-0.5">
        <h2 className="text-base">{t('home.stockStatus')}</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat num={totalItems} label={t('home.itemsMonitored')} />
        <Stat num={expiring7d} label={t('home.expiring')} warn={expiring7d > 0} />
        <Stat num={runningOut7d} label={t('home.nearlyOut')} warn={runningOut7d > 0} />
        <Stat num="—" label={t('home.storesRecorded')} />
      </div>

      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h2 className="text-base">{t('home.needsAttention')}</h2>
          <Button variant="ghost" size="sm" onClick={() => setView('inventory')}>
            {t('home.seeAll')}
          </Button>
        </div>
        <Panel>
          {needs.length === 0 ? (
            <Empty icon={IconBox} title={t('home.allSafe')} desc={t('home.allSafeDesc')} />
          ) : (
            <div className="flex flex-col">
              {needs.map((s) => (
                <div
                  className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 border-b border-border last:border-b-0 hover:bg-surface-sunken transition-colors"
                  key={s.id}
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-base flex items-center gap-3 flex-wrap">
                      {s.name}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-text-muted flex-wrap">
                      <TimeSignal
                        expiryDays={getDaysUntil(s.expiry_date)}
                        runOut={s.run_out_days}
                        basis={s.basis}
                      />
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="font-semibold">
                      {s.qty} {s.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <section className="mt-9">
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h2 className="text-base">{t('home.nextTrip')}</h2>
          <Button variant="ghost" size="sm" onClick={askAssistant}>
            <IconSpark size={15} /> {t('home.askPlan')}
          </Button>
        </div>
        {nextTrip ? (
          <div className="bg-accent-soft border border-accent-soft-border rounded-lg p-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <div className="text-base font-semibold">
                {t('home.shopAt', { store: nextTrip.store })}
              </div>
              <div className="text-text-muted mt-2">
                {t('home.itemCount', { count: nextTrip.items?.length ?? 0 })}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {nextTrip.items?.map((it) => (
                  <Chip key={it.id}>{it.name}</Chip>
                ))}
              </div>
            </div>
            <Button onClick={() => setView('plan')}>{t('home.seePlan')}</Button>
          </div>
        ) : (
          <Panel>
            <Empty
              icon={IconBox}
              title={t('home.noPlanYet') || 'No trip planned'}
              desc={t('home.noPlanYetDesc') || 'Ask the assistant to plan your next shopping trip.'}
            />
          </Panel>
        )}
      </section>

      <section className="mt-9">
        <h2 className="text-base mb-4">{t('home.quickRefill')}</h2>
        <Panel className="p-6 flex flex-wrap gap-5 items-center">
          <div className="w-12 h-12 rounded-lg bg-accent-soft grid place-items-center text-accent m-0">
            <IconReceipt size={24} />
          </div>
          <div className="flex-1 min-w-[220px]">
            <div className="font-semibold text-md">{t('home.quickRefillTitle')}</div>
            <div className="text-text-muted text-sm mt-2">{t('home.quickRefillDesc')}</div>
          </div>
          <Button onClick={() => setView('add')}>
            <IconReceipt size={18} /> {t('home.addFromReceipt')}
          </Button>
        </Panel>
      </section>

      <section className="mt-9">
        <div className="bg-accent-soft border border-accent-soft-border border-l-[3px] border-l-accent rounded-lg p-5 grid grid-cols-[auto_1fr_auto] gap-4 items-center">
          <div className="w-10 h-10 rounded-lg bg-surface-raised grid place-items-center text-accent">
            <IconLeaf size={20} />
          </div>
          <div>
            <div className="font-semibold text-md">{t('home.savingsTip')}</div>
            <div className="text-sm mt-0.5">{t('home.savingsTipText')}</div>
          </div>
          <Button size="sm" onClick={askAssistant}>
            <IconSpark size={15} /> {t('home.askRecipe')}
          </Button>
        </div>
      </section>
    </>
  )
}

function Stat({ num, label, warn }) {
  return (
    <div className="bg-surface-raised border border-border rounded-lg p-5">
      <div className={cn('text-xl font-bold tracking-tight', warn ? 'text-warn' : 'text-text')}>
        {num}
      </div>
      <div className="text-sm text-text-muted mt-2 font-medium">{label}</div>
    </div>
  )
}

function Empty({ icon, title, desc }) {
  const Icon = icon
  return (
    <div className="text-center px-6 py-12 text-text-muted">
      <div className="w-12 h-12 mx-auto mb-4 text-text-faint">
        <Icon size={48} />
      </div>
      <div className="font-semibold text-text text-base">{title}</div>
      <div className="text-sm mt-2 max-w-[44ch] mx-auto">{desc}</div>
    </div>
  )
}
