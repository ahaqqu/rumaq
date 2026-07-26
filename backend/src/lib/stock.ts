const DEFAULT_RUN_OUT_DAYS = 30;
const STALE_GAP_DAYS = 90;
const MAX_HISTORY_ROWS = 100;

export async function computeRunOutDays(
  householdId: string,
  itemId: string,
  currentQty: number,
  db: D1Database,
): Promise<{ run_out_days: number | null; basis: string }> {
  if (currentQty <= 0) {
    return { run_out_days: 0, basis: "default" };
  }

  const purchases = await db
    .prepare(
      `SELECT pi.qty, p.date
       FROM purchase_items pi
       JOIN purchases p ON p.id = pi.purchase_id
       WHERE p.household_id = ? AND pi.item_id = ?
       ORDER BY p.date DESC
       LIMIT ?`,
    )
    .bind(householdId, itemId, MAX_HISTORY_ROWS)
    .all<{ qty: number; date: string }>();

  if (!purchases.results || purchases.results.length < 2) {
    return { run_out_days: DEFAULT_RUN_OUT_DAYS, basis: "default" };
  }

  const sorted = purchases.results.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const lastDate = new Date(sorted[sorted.length - 1].date);
  const now = Date.now();
  if ((now - lastDate.getTime()) / 86400000 > STALE_GAP_DAYS) {
    return { run_out_days: DEFAULT_RUN_OUT_DAYS, basis: "default" };
  }

  const totalQty = sorted.reduce((sum, r) => sum + r.qty, 0);
  const firstDate = new Date(sorted[0].date);
  const daysSpan = (lastDate.getTime() - firstDate.getTime()) / 86400000;

  if (daysSpan <= 0 || totalQty <= 0) {
    return { run_out_days: DEFAULT_RUN_OUT_DAYS, basis: "default" };
  }

  const dailyConsumption = weightedDailyConsumption(sorted);
  if (dailyConsumption <= 0) {
    return { run_out_days: DEFAULT_RUN_OUT_DAYS, basis: "default" };
  }

  const runOutDays = Math.round(currentQty / dailyConsumption);
  return {
    run_out_days: runOutDays,
    basis: sorted.length >= 2 ? "history" : "default",
  };
}

export function weightedDailyConsumption(sorted: Array<{ qty: number; date: string }>): number {
  const n = sorted.length;
  if (n < 2) return 0;
  const firstDate = new Date(sorted[0].date).getTime();
  const lastDate = new Date(sorted[n - 1].date).getTime();
  const daysSpan = (lastDate - firstDate) / 86400000;
  if (daysSpan <= 0) return 0;

  let weightSum = 0;
  let qtyWeighted = 0;
  for (let i = 0; i < n; i++) {
    const weight = i + 1;
    weightSum += weight;
    qtyWeighted += sorted[i].qty * weight;
  }
  const weightedAvgQty = qtyWeighted / weightSum;
  return weightedAvgQty / daysSpan;
}
