export async function computeRunOutDays(
  householdId: string,
  itemId: string,
  currentQty: number,
  db: D1Database
): Promise<{ run_out_days: number | null; basis: string }> {
  if (currentQty <= 0) {
    return { run_out_days: 0, basis: 'default' }
  }

  const purchases = await db
    .prepare(
      `SELECT pi.qty, p.date
       FROM purchase_items pi
       JOIN purchases p ON p.id = pi.purchase_id
       WHERE p.household_id = ? AND pi.item_id = ?
       ORDER BY p.date DESC
       LIMIT 5`
    )
    .bind(householdId, itemId)
    .all<{ qty: number; date: string }>()

  if (!purchases.results || purchases.results.length < 2) {
    return { run_out_days: 30, basis: 'default' }
  }

  const sorted = purchases.results.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const totalQty = sorted.reduce((sum, r) => sum + r.qty, 0)
  const firstDate = new Date(sorted[0].date)
  const lastDate = new Date(sorted[sorted.length - 1].date)
  const daysSpan = (lastDate.getTime() - firstDate.getTime()) / 86400000

  if (daysSpan <= 0 || totalQty <= 0) {
    return { run_out_days: 30, basis: 'default' }
  }

  const dailyConsumption = totalQty / daysSpan
  const runOutDays = Math.round(currentQty / dailyConsumption)

  return { run_out_days: runOutDays, basis: 'history' }
}
