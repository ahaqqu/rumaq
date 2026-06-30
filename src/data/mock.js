// rumaq mock data — Indonesian household grocery context
// Prototype data only. No backend.

export const LOCATIONS = [
  { id: 'kulkas', label: 'Kulkas' },
  { id: 'freezer', label: 'Freezer' },
  { id: 'lemari', label: 'Lemari dapur' },
  { id: 'rak', label: 'Rak atas' },
]

export const STORES = [
  { id: 'indomaret', label: 'Indomaret' },
  { id: 'alfamart', label: 'Alfamart' },
  { id: 'pasar', label: 'Pasar' },
]

// runOut: estimated days until empty, based on purchase history
// expiryDays: days until expiry (null = no expiry / non-perishable)
// updated: last time stock was inserted/adjusted (receipt confirmed or estimate recomputed).
// Shown in rows because users rarely touch stock — recency must be visible at a glance.
export const STOCK = [
  { id: 's1', name: 'Susu cair', unit: 'L', qty: 0.8, location: 'kulkas', store: 'indomaret', expiryDays: 3, runOut: 2, basis: '4 minggu terakhir', updated: '2026-06-28' },
  { id: 's2', name: 'Telur', unit: 'pcs', qty: 4, location: 'kulkas', store: 'pasar', expiryDays: 10, runOut: 3, basis: '4 minggu terakhir', updated: '2026-06-25' },
  { id: 's3', name: 'Beras', unit: 'kg', qty: 2.3, location: 'lemari', store: 'alfamart', expiryDays: null, runOut: 9, basis: '6 minggu terakhir', updated: '2026-06-15' },
  { id: 's4', name: 'Minyak goreng', unit: 'L', qty: 0.4, location: 'lemari', store: 'indomaret', expiryDays: null, runOut: 4, basis: '4 minggu terakhir', updated: '2026-06-20' },
  { id: 's5', name: 'Roti tawar', unit: 'pack', qty: 0.5, location: 'kulkas', store: 'indomaret', expiryDays: 1, runOut: 1, basis: '4 minggu terakhir', updated: '2026-06-28' },
  { id: 's6', name: 'Bayam', unit: 'ikat', qty: 1, location: 'kulkas', store: 'pasar', expiryDays: 2, runOut: 2, basis: '2 minggu terakhir', updated: '2026-06-25' },
  { id: 's7', name: 'Daging ayam', unit: 'kg', qty: 0.6, location: 'freezer', store: 'pasar', expiryDays: 20, runOut: 6, basis: '4 minggu terakhir', updated: '2026-06-15' },
  { id: 's8', name: 'Kopi bubuk', unit: 'g', qty: 180, location: 'rak', store: 'alfamart', expiryDays: null, runOut: 12, basis: '6 minggu terakhir', updated: '2026-06-22' },
  { id: 's9', name: 'Gula', unit: 'kg', qty: 0.9, location: 'lemari', store: 'indomaret', expiryDays: null, runOut: 18, basis: '4 minggu terakhir', updated: '2026-06-20' },
  { id: 's10', name: 'Keju slice', unit: 'pcs', qty: 6, location: 'kulkas', store: 'alfamart', expiryDays: 7, runOut: 5, basis: '4 minggu terakhir', updated: '2026-06-08' },
  { id: 's11', name: 'Wortel', unit: 'kg', qty: 0.5, location: 'kulkas', store: 'pasar', expiryDays: 5, runOut: 4, basis: '4 minggu terakhir', updated: '2026-06-25' },
  { id: 's12', name: 'Margarin', unit: 'pkg', qty: 0.2, location: 'kulkas', store: 'indomaret', expiryDays: 14, runOut: 3, basis: '4 minggu terakhir', updated: '2026-06-28' },
  { id: 's13', name: 'Teh celup', unit: 'bags', qty: 20, location: 'rak', store: 'indomaret', expiryDays: null, runOut: 25, basis: '6 minggu terakhir', updated: '2026-06-08' },
  { id: 's14', name: 'Air mineral', unit: 'btl', qty: 5, location: 'rak', store: 'alfamart', expiryDays: null, runOut: 3, basis: '4 minggu terakhir', updated: '2026-06-22' },
  { id: 's15', name: 'Bawang merah', unit: 'kg', qty: 0.3, location: 'lemari', store: 'pasar', expiryDays: 12, runOut: 7, basis: '4 minggu terakhir', updated: '2026-06-15' },
]

// AI-proposed shopping plan grouped by store into executable trips
export const PLAN = [
  {
    store: 'indomaret',
    items: [
      { id: 'p1', name: 'Susu cair 1L', qty: '1 L', price: 18500, why: 'Hampir habis, ~2 hari lagi' },
      { id: 'p2', name: 'Roti tawar', qty: '1 pack', price: 15000, why: 'Kedaluwarsa besok' },
      { id: 'p3', name: 'Margarin', qty: '1 pkg', price: 14000, why: 'Hampir habis, ~3 hari lagi' },
    ],
  },
  {
    store: 'pasar',
    items: [
      { id: 'p4', name: 'Telur', qty: '10 pcs', price: 28000, why: 'Hampir habis, ~3 hari lagi' },
      { id: 'p5', name: 'Bayam', qty: '2 ikat', price: 6000, why: 'Akan kedaluwarsa, ganti stok' },
    ],
  },
  {
    store: 'alfamart',
    items: [
      { id: 'p6', name: 'Air mineral 600ml x12', qty: '1 pak', price: 18000, why: 'Hampir habis, ~3 hari lagi' },
    ],
  },
]

// Purchase history — substrate for run-out estimates
export const HISTORY = [
  { date: '2026-06-28', store: 'indomaret', item: 'Susu cair', qty: '1 L', price: 18500 },
  { date: '2026-06-28', store: 'indomaret', item: 'Roti tawar', qty: '1 pack', price: 15000 },
  { date: '2026-06-28', store: 'indomaret', item: 'Margarin', qty: '1 pkg', price: 14000 },
  { date: '2026-06-25', store: 'pasar', item: 'Telur', qty: '10 pcs', price: 28000 },
  { date: '2026-06-25', store: 'pasar', item: 'Bayam', qty: '2 ikat', price: 5000 },
  { date: '2026-06-25', store: 'pasar', item: 'Wortel', qty: '0.5 kg', price: 8000 },
  { date: '2026-06-22', store: 'alfamart', item: 'Air mineral', qty: '1 pak', price: 18000 },
  { date: '2026-06-22', store: 'alfamart', item: 'Kopi bubuk', qty: '250 g', price: 45000 },
  { date: '2026-06-20', store: 'indomaret', item: 'Minyak goreng', qty: '2 L', price: 38000 },
  { date: '2026-06-20', store: 'indomaret', item: 'Gula', qty: '1 kg', price: 16000 },
  { date: '2026-06-15', store: 'pasar', item: 'Daging ayam', qty: '1 kg', price: 55000 },
  { date: '2026-06-15', store: 'pasar', item: 'Bawang merah', qty: '0.5 kg', price: 12000 },
  { date: '2026-06-08', store: 'indomaret', item: 'Teh celup', qty: '50 bags', price: 13000 },
  { date: '2026-06-08', store: 'indomaret', item: 'Keju slice', qty: '1 pkg', price: 22000 },
]

// Parsed receipt used by Add-from-receipt flow after "scan"
export const PARSED_RECEIPT = {
  store: 'indomaret',
  date: '2026-06-29',
  total: 90500,
  items: [
    { id: 'r1', name: 'Susu cair 1L', qty: '1', unit: 'L', price: 18500 },
    { id: 'r2', name: 'Roti tawar', qty: '1', unit: 'pack', price: 15000 },
    { id: 'r3', name: 'Telur 10pcs', qty: '1', unit: 'pkg', price: 32000 },
    { id: 'r4', name: 'Apel Fuji', qty: '0.5', unit: 'kg', price: 17500 },
    { id: 'r5', name: 'Air mineral 600ml', qty: '6', unit: 'btl', price: 7500 },
  ],
}

export const formatRp = (n) =>
  'Rp' + n.toLocaleString('id-ID')

export const locLabel = (id) => LOCATIONS.find((l) => l.id === id)?.label ?? id
export const storeLabel = (id) => STORES.find((s) => s.id === id)?.label ?? id

// "today" in the mock world — keeps relative labels stable regardless of the real date.
export const TODAY = new Date('2026-06-29T00:00:00')

export function relUpdated(iso) {
  const d = new Date(iso + 'T00:00:00')
  const days = Math.round((TODAY - d) / 86400000)
  if (days <= 0) return 'hari ini'
  if (days === 1) return 'kemarin'
  return `${days} hari lalu`
}

// AI usage — Gemini-style daily quota (20 requests/day).
export const AI_USAGE = { provider: 'Gemini', used: 17, limit: 20 }

export function usageState(u = AI_USAGE) {
  const pct = Math.min(100, Math.round((u.used / u.limit) * 100))
  const remaining = Math.max(0, u.limit - u.used)
  const warn = u.used >= Math.round(u.limit * 0.8) && u.used < u.limit
  const danger = u.used >= u.limit
  return { pct, remaining, warn, danger }
}
