import { useTranslation } from 'react-i18next'
import { HISTORY, formatRp, storeLabel } from '../data/mock.js'
import { usePersona } from '../context/PersonaContext.jsx'
import { personaText } from '../lib/persona.js'
import { IconHistory, IconSpark } from '../components/icons.jsx'

export default function History({ askAssistant }) {
  const { t } = useTranslation()
  const { persona } = usePersona()
  const monthNames = t('history.months', { returnObjects: true })

  const groups = []
  let lastMonth = null
  for (const r of [...HISTORY].sort((a, b) => (a.date < b.date ? 1 : -1))) {
    const m = r.date.slice(0, 7)
    if (m !== lastMonth) {
      groups.push({ month: m, rows: [], total: 0 })
      lastMonth = m
    }
    const g = groups[groups.length - 1]
    g.rows.push(r)
    g.total += r.price
  }

  const monthLabel = (m) => {
    const [y, mo] = m.split('-')
    return `${monthNames[Number(mo)]} ${y}`
  }
  const fmtDate = (d) => {
    const [, m, day] = d.split('-')
    return `${Number(day)} ${monthNames[Number(m)]}`
  }

  return (
    <>
      <div className="page__head">
        <p className="page__lead">
          {personaText('historyLead', persona, t)}
        </p>
      </div>

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>{t('history.date')}</th>
              <th>{t('history.item')}</th>
              <th>{t('history.store')}</th>
              <th className="num">{t('history.price')}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Group key={g.month} g={g} monthLabel={monthLabel} fmtDate={fmtDate} t={t} formatRp={formatRp} />
            ))}
          </tbody>
        </table>
      </div>

      <section className="section">
        <div className="panel" style={{ padding: 'var(--sp-5)', display: 'flex', gap: 'var(--sp-4)', alignItems: 'center' }}>
          <div style={{ color: 'var(--accent)' }}><IconSpark size={20} /></div>
          <div style={{ flex: 1, fontSize: 'var(--fs-sm)' }}>
            <strong>{t('history.patternDetected')}</strong> {t('history.patternText')}
          </div>
          <button className="btn btn--ghost btn--sm" onClick={askAssistant}>{t('history.makePlan')}</button>
        </div>
      </section>
    </>
  )
}

function Group({ g, monthLabel, fmtDate, t, formatRp }) {
  return (
    <>
      <tr className="month-sep">
        <td colSpan={4}>{monthLabel(g.month)} · {t('history.total')} {formatRp(g.total)}</td>
      </tr>
      {g.rows.map((r, i) => (
        <tr key={r.date + r.item + i}>
          <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.date)}</td>
          <td>{r.item} <span style={{ color: 'var(--text-muted)' }}>· {r.qty}</span></td>
          <td>{storeLabel(r.store)}</td>
          <td className="num">{formatRp(r.price)}</td>
        </tr>
      ))}
    </>
  )
}
