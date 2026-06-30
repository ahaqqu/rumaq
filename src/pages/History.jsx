import { HISTORY, formatRp, storeLabel } from '../data/mock.js'
import { IconHistory, IconSpark } from '../components/icons.jsx'

export default function History({ askAssistant }) {
  // group by month YYYY-MM
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
    const names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    return `${names[Number(mo)]} ${y}`
  }
  const fmtDate = (d) => {
    const [, m, day] = d.split('-')
    return `${Number(day)} ${['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][Number(m)]}`
  }

  return (
    <>
      <div className="page__head">
        <p className="page__lead">
          Catatan pembelian menjadi dasar perkiraan sisa stok. Bandingkan harga dan ritme belanjamu di sini.
        </p>
      </div>

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Item</th>
              <th>Toko</th>
              <th className="num">Harga</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Group key={g.month} g={g} monthLabel={monthLabel} fmtDate={fmtDate} />
            ))}
          </tbody>
        </table>
      </div>

      <section className="section">
        <div className="panel" style={{ padding: 'var(--sp-5)', display: 'flex', gap: 'var(--sp-4)', alignItems: 'center' }}>
          <div style={{ color: 'var(--accent)' }}><IconSpark size={20} /></div>
          <div style={{ flex: 1, fontSize: 'var(--fs-sm)' }}>
            <strong>Pola terdeteksi:</strong> Susu cair dan roti dibeli tiap 7 hari dari Indomaret. Asisten bisa mengingatkan sebelum habis.
          </div>
          <button className="btn btn--ghost btn--sm" onClick={askAssistant}>Buat rencana</button>
        </div>
      </section>
    </>
  )
}

function Group({ g, monthLabel, fmtDate }) {
  return (
    <>
      <tr className="month-sep">
        <td colSpan={4}>{monthLabel(g.month)} · total {formatRp(g.total)}</td>
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
