import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatRp } from '../data/mock.js'
import { usePersona } from '../context/PersonaContext.jsx'
import { personaText } from '../lib/persona.js'
import { IconSpark } from '../components/icons.jsx'
import { useHistory, usePurchasePatterns, useStores } from '../lib/queries/index.js'
import { getReceiptUrl } from '../lib/api.js'

export function History({ askAssistant }) {
  const { t } = useTranslation()
  const { persona } = usePersona()
  const monthNames = t('history.months', { returnObjects: true })

  const [store, setStore] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(null)
  const [lightbox, setLightbox] = useState(null)

  const filters = {
    store: store || undefined,
    from: from || undefined,
    to: to || undefined,
    q: q || undefined,
  }

  const history = useHistory({ ...filters, cursor })
  const patterns = usePurchasePatterns()
  const stores = useStores()

  const purchases = history.data?.purchases ?? []
  const monthTotals = history.data?.month_totals ?? []
  const avgPerMonth = history.data?.avg_per_month ?? 0
  const nextCursor = history.data?.next_cursor ?? null
  const patternItems = patterns.data?.patterns ?? []
  const storeOptions = stores.data?.stores ?? []

  const groups = useMemo(() => {
    const map = new Map()
    for (const p of purchases) {
      const m = String(p.date).slice(0, 7)
      const g = map.get(m) ?? { month: m, rows: [], total: 0 }
      g.rows.push(p)
      g.total += p.total || 0
      map.set(m, g)
    }
    return Array.from(map.values())
  }, [purchases])

  const monthLabel = (m) => {
    const [y, mo] = m.split('-')
    return `${monthNames[Number(mo)]} ${y}`
  }
  const fmtDate = (d) => {
    const [, m, day] = d.split('-')
    return `${Number(day)} ${monthNames[Number(m)]}`
  }

  const applyFilters = () => setCursor(null)

  const loadMore = () => {
    if (nextCursor) setCursor(nextCursor)
  }

  const totalSpend = monthTotals.reduce((s, m) => s + (m.total || 0), 0)

  return (
    <>
      <div className="page__head">
        <p className="page__lead">{personaText('historyLead', persona, t)}</p>
      </div>

      <div className="panel" style={{ padding: 'var(--sp-4)' }}>
        <div
          style={{
            display: 'grid',
            gap: 'var(--sp-3)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          }}
        >
          <input
            className="input"
            type="search"
            placeholder={t('history.searchPlaceholder')}
            aria-label={t('history.searchPlaceholder')}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              applyFilters()
            }}
          />
          <select
            className="input"
            value={store}
            onChange={(e) => {
              setStore(e.target.value)
              applyFilters()
            }}
            aria-label={t('history.filterStore')}
          >
            <option value="">{t('history.filterAll')}</option>
            {storeOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="date"
            value={from}
            aria-label={t('history.filterFrom')}
            onChange={(e) => {
              setFrom(e.target.value)
              applyFilters()
            }}
          />
          <input
            className="input"
            type="date"
            value={to}
            aria-label={t('history.filterTo')}
            onChange={(e) => {
              setTo(e.target.value)
              applyFilters()
            }}
          />
        </div>
      </div>

      {history.isLoading && (
        <div className="panel" style={{ padding: 'var(--sp-5)', textAlign: 'center' }}>
          {t('history.loading')}
        </div>
      )}

      {history.isError && !history.isLoading && (
        <div
          className="panel"
          style={{
            padding: 'var(--sp-5)',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          {t('history.error')}
        </div>
      )}

      {!history.isLoading && !history.isError && purchases.length === 0 && (
        <div className="panel" style={{ padding: 'var(--sp-5)', textAlign: 'center' }}>
          <div className="empty__title">{t('history.empty')}</div>
          <div className="empty__desc" style={{ color: 'var(--text-muted)' }}>
            {t('history.emptyDesc')}
          </div>
        </div>
      )}

      {!history.isLoading && !history.isError && purchases.length > 0 && (
        <>
          <div
            className="panel"
            style={{
              padding: 'var(--sp-4)',
              display: 'flex',
              gap: 'var(--sp-4)',
              flexWrap: 'wrap',
              color: 'var(--text-muted)',
              fontSize: 'var(--fs-sm)',
            }}
          >
            <div>
              <strong>{t('history.total')}</strong> {formatRp(totalSpend)}
            </div>
            <div>
              <strong>{t('history.avgPerMonth')}</strong> {formatRp(avgPerMonth)}
            </div>
          </div>

          <div className="panel">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('history.date')}</th>
                  <th>{t('history.item')}</th>
                  <th>{t('history.store')}</th>
                  <th className="num">{t('history.price')}</th>
                  <th>{t('history.receipt')}</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <Group
                    key={g.month}
                    g={g}
                    monthLabel={monthLabel}
                    fmtDate={fmtDate}
                    t={t}
                    formatRp={formatRp}
                    onReceiptClick={setLightbox}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {nextCursor && (
            <div style={{ textAlign: 'center', marginTop: 'var(--sp-4)' }}>
              <button
                className="btn btn--secondary btn--sm"
                onClick={loadMore}
                disabled={history.isFetching}
              >
                {history.isFetching ? t('history.loading') : t('history.loadMore')}
              </button>
            </div>
          )}
        </>
      )}

      {patternItems.length > 0 && (
        <section className="section">
          <div className="panel" style={{ padding: 'var(--sp-5)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-2)',
                marginBottom: 'var(--sp-3)',
              }}
            >
              <span style={{ color: 'var(--accent)' }}>
                <IconSpark size={18} />
              </span>
              <strong>{t('history.patternsTitle')}</strong>
            </div>
            <ul style={{ display: 'grid', gap: 'var(--sp-2)' }}>
              {patternItems.slice(0, 5).map((p) => (
                <li
                  key={p.item_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--sp-3)',
                  }}
                >
                  <span>{p.name}</span>
                  <span
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: 'var(--fs-sm)',
                    }}
                  >
                    {t('history.patternSummary', {
                      name: '',
                      pattern:
                        p.avg_interval_days != null
                          ? t('history.patternEvery', {
                              n: p.avg_interval_days,
                              count: p.avg_interval_days,
                            })
                          : t('history.patternRecently'),
                      qty: p.avg_qty,
                    }).trim()}
                  </span>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 'var(--sp-4)' }}>
              <button className="btn btn--ghost btn--sm" onClick={askAssistant}>
                {t('history.makePlan')}
              </button>
            </div>
          </div>
        </section>
      )}

      {lightbox && (
        <div
          className="scrim"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label={t('history.receipt')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
            }}
          >
            <img
              src={getReceiptUrl(lightbox)}
              alt={t('history.receipt')}
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                objectFit: 'contain',
              }}
            />
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => setLightbox(null)}
              style={{
                position: 'absolute',
                top: 'var(--sp-2)',
                right: 'var(--sp-2)',
              }}
              aria-label={t('history.closeReceipt')}
            >
              {t('history.closeReceipt')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function Group({ g, monthLabel, fmtDate, t, formatRp, onReceiptClick }) {
  return (
    <>
      <tr className="month-sep">
        <td colSpan={5}>
          {monthLabel(g.month)} · {t('history.purchases_count', { count: g.rows.length })} ·{' '}
          {t('history.total')} {formatRp(g.total)}
        </td>
      </tr>
      {g.rows.map((p, i) =>
        p.items.map((it, j) => (
          <tr key={p.id + it.id + j}>
            {j === 0 ? (
              <td style={{ whiteSpace: 'nowrap' }} rowSpan={p.items.length}>
                {fmtDate(p.date)}
              </td>
            ) : null}
            <td>
              {it.name || '—'}{' '}
              <span style={{ color: 'var(--text-muted)' }}>
                · {it.qty}
                {it.unit ? ` ${it.unit}` : ''}
              </span>
            </td>
            <td>{p.store_label || '—'}</td>
            <td className="num">
              {it.price != null
                ? formatRp(it.price)
                : j === p.items.length - 1
                  ? formatRp(p.total)
                  : ''}
            </td>
            <td>
              {j === 0 && p.has_receipt ? (
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => onReceiptClick(p.id)}
                  aria-label={t('history.receipt')}
                >
                  {t('history.receipt')}
                </button>
              ) : null}
            </td>
          </tr>
        ))
      )}
    </>
  )
}
