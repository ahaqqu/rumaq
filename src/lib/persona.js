/**
 * RumaQ persona engine.
 *
 * Users declare "saya adalah X, kamu adalah Y" as free text. The AI then
 * rewrites all UI copy so the app (role Y) speaks to the user (role X).
 * Generated copy is cached; the theme color is derived from the role pair.
 */

export const PERSONA_KEY = 'rumaq:persona'

export const DEFAULT_PERSONA = {
  enabled: false,
  userRole: '',
  aiRole: '',
  hue: 230,
  generatedCopy: null,
}

// Base copy for every screen that supports personalization.
export const COPY = {
  homeLead: 'Stok terpantau otomatis dari struk belanja. Sisa dihitung dari kebiasaanmu, bukan diisi manual.',
  inventoryLead: 'Jelajahi dan bandingkan stok. Saring berdasarkan lokasi penyimpanan, urut otomatis dari yang paling mendesak.',
  planLeadNoKey: 'Hubungkan kunci API dulu, lalu AI menyusun rencana belanja dari stok yang menipis.',
  planLead: 'AI mengelompokkan item per toko menjadi satu perjalanan. Centang yang sudah dibeli, sisanya otomatis tercatat.',
  historyLead: 'Catatan pembelian menjadi dasar perkiraan sisa stok. Bandingkan harga dan ritme belanjamu di sini.',
  receiptLead: 'Foto atau unggah struk. AI membaca item, jumlah, harga, dan toko, lalu kamu konfirmasi.',
  settingsLead: 'Bawa kunci AI sendiri, kelola lokasi penyimpanan, dan atur kenyamanan tampilan.',
  assistantGreeting: 'Saya sudah cek stokmu.',
  assistantQuestion: 'Mau saya buatkan rencananya?',
}

export function loadPersona() {
  try {
    const raw = localStorage.getItem(PERSONA_KEY)
    if (!raw) return DEFAULT_PERSONA
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_PERSONA, ...parsed, hue: deriveHue(parsed.userRole, parsed.aiRole) }
  } catch {
    return DEFAULT_PERSONA
  }
}

export function savePersona(persona) {
  localStorage.setItem(PERSONA_KEY, JSON.stringify(persona))
}

/**
 * Return personalized copy for a key. Uses AI-generated copy if available,
 * otherwise falls back to the rule-based rewriter.
 */
export function personaText(key, persona) {
  const base = COPY[key]
  if (!persona || !persona.enabled || !persona.userRole || !persona.aiRole) return base
  if (persona.generatedCopy?.[key]) return persona.generatedCopy[key]
  return speak(base, persona)
}

export function deriveHue(userRole = '', aiRole = '') {
  const key = `${userRole.trim().toLowerCase()}|${aiRole.trim().toLowerCase()}`
  if (!key.replace('|', '')) return 230
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 360
}

function normalize(role = '') {
  return role.trim().toLowerCase().replace(/[^a-z]/g, '')
}

function detectMood(userRole, aiRole) {
  const u = normalize(userRole)
  const a = normalize(aiRole)

  if ((u.includes('raja') || u.includes('ratu')) && (a.includes('prajurit') || a.includes('abdi') || a.includes('pelayan'))) {
    return 'servant-to-royal'
  }
  if ((u.includes('guru') || u.includes('dosen')) && (a.includes('murid') || a.includes('siswa') || a.includes('mahasiswa'))) {
    return 'student-to-teacher'
  }
  if ((u.includes('dokter')) && (a.includes('pasien') || a.includes('suster'))) {
    return 'medical'
  }
  if ((u.includes('bos') || u.includes('manajer') || u.includes('manager')) && (a.includes('pegawai') || a.includes('karyawan'))) {
    return 'employee-to-boss'
  }
  if (a.includes('teman') || a.includes('sahabat') || a.includes('bestie')) {
    return 'casual'
  }
  return 'generic'
}

export function speak(text, persona) {
  if (!persona || !persona.enabled || !persona.userRole || !persona.aiRole) return text

  const u = persona.userRole
  const a = persona.aiRole
  const mood = detectMood(u, a)

  switch (mood) {
    case 'servant-to-royal':
      return `Yang Mulia ${u}, izinkan hamba ${a} melaporkan: ${text} Demikian yang dapat hamba sampaikan, Yang Mulia.`
    case 'student-to-teacher':
      return `Maaf mengganggu, ${u}. Saya ${a} ingin menyampaikan: ${text} Terima kasih, ${u}.`
    case 'medical':
      return `Selamat datang, ${u}. Saya ${a} Anda. ${text}`
    case 'employee-to-boss':
      return `Permisi, ${u}. Izin melaporkan dari ${a}: ${text}`
    case 'casual':
      return `Hei ${u}, ${a} di sini. ${text}`
    default:
      return `Halo ${u}, saya ${a}. ${text}`
  }
}

export function buildSystemPrompt(persona) {
  const base = 'Kamu adalah asisten inventaris dan belanja rumah tangga bernama RumaQ. Jawab dengan jelas, singkat, dan praktis.'
  if (!persona || !persona.enabled || !persona.userRole || !persona.aiRole) return base

  const u = persona.userRole
  const a = persona.aiRole
  const mood = detectMood(u, a)

  let roleInstruction = `Bayangkan kamu adalah ${a} dan pengguna adalah ${u}. Seluruh jawabanmu harus sesuai peran tersebut.`

  switch (mood) {
    case 'servant-to-royal':
      roleInstruction = `Bayangkan kamu adalah ${a} yang setia dan pengguna adalah ${u}. Gunakan bahasa yang sangat hormat, sopan, dan layaknya laporan kepada raja/raja.`
      break
    case 'student-to-teacher':
      roleInstruction = `Bayangkan kamu adalah ${a} dan pengguna adalah ${u}. Gunakan bahasa yang sopan seperti anak didik berbicara kepada gurunya.`
      break
    case 'medical':
      roleInstruction = `Bayangkan kamu adalah ${a} dan pengguna adalah ${u}. Gunakan bahasa yang tenang, jelas, dan profesional.`
      break
    case 'employee-to-boss':
      roleInstruction = `Bayangkan kamu adalah ${a} dan pengguna adalah ${u}. Gunakan bahasa formal dan ringkas seperti laporan kepada atasan.`
      break
    case 'casual':
      roleInstruction = `Bayangkan kamu adalah ${a} dan pengguna adalah ${u}. Gunakan bahasa santai dan akrab.`
      break
  }

  return `${base} ${roleInstruction}`
}

function stripJsonMarkdown(text) {
  return text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
}

async function callOpenAICompatible(prompt, aiKey, baseUrl, model) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  })
  if (!res.ok) throw new Error(`AI request failed: ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

async function callGemini(prompt, aiKey, model) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  )
  if (!res.ok) throw new Error(`AI request failed: ${res.status}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function callAnthropic(prompt, aiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': aiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`AI request failed: ${res.status}`)
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

async function callAI(prompt, aiKey, provider) {
  switch (provider) {
    case 'gemini':
      return callGemini(prompt, aiKey, 'gemini-1.5-flash')
    case 'anthropic':
      return callAnthropic(prompt, aiKey)
    case 'openai':
      return callOpenAICompatible(prompt, aiKey, 'https://api.openai.com/v1', 'gpt-4o-mini')
    case 'opencode':
    default:
      return callOpenAICompatible(prompt, aiKey, 'https://api.opencode.ai/v1', 'opencode-mini')
  }
}

/**
 * Ask AI to rewrite all COPY entries for the given persona.
 * Returns an object keyed like COPY.
 */
export async function generatePersonaCopy(persona, aiKey, provider) {
  if (!persona.enabled || !persona.userRole || !persona.aiRole || !aiKey) {
    return null
  }

  const prompt = `Kamu sedang menyesuaikan bahasa aplikasi RumaQ (asisten inventaris rumah tangga) agar sesuai peran.

Pengguna menyatakan: "saya adalah ${persona.userRole}, kamu adalah ${persona.aiRole}".
Artinya, seluruh teks aplikasi harus ditulis seolah-olah aplikasi/kamu (${persona.aiRole}) sedang berbicara kepada pengguna (${persona.userRole}).

Berikut teks dasar yang perlu ditulis ulang:
${Object.entries(COPY)
  .map(([key, text]) => `${key}: """${text}"""`)
  .join('\n')}

Tugas:
1. Tulis ulang setiap teks di atas dengan gaya, pilihan kata, dan tingkat formalitas yang cocok untuk peran "${persona.aiRole}" berbicara kepada "${persona.userRole}".
2. Jangan ubah makna atau informasi penting (misalnya tetap sebutkan struk, stok, rencana, dll).
3. Jangan membuat teks terlalu panjang; tetap singkat dan nyaman dibaca di layar kecil.
4. Kembalikan hasil dalam format JSON murni, kunci sama persis dengan daftar di atas, tanpa markdown atau penjelasan tambahan.

Contoh output:
{
  "homeLead": "...",
  "inventoryLead": "..."
}`

  const raw = await callAI(prompt, aiKey, provider)
  const json = stripJsonMarkdown(raw)
  const parsed = JSON.parse(json)

  // Ensure every key exists; fall back to base text if AI missed one.
  const result = {}
  for (const key of Object.keys(COPY)) {
    result[key] = typeof parsed[key] === 'string' ? parsed[key] : COPY[key]
  }
  return result
}

function oklch(l, c, h) {
  return `oklch(${l} ${c} ${h})`
}

export function applyTheme(persona, element = document.documentElement) {
  if (!persona || !persona.enabled) {
    element.style.removeProperty('--accent')
    element.style.removeProperty('--accent-hover')
    element.style.removeProperty('--accent-pressed')
    element.style.removeProperty('--accent-soft')
    element.style.removeProperty('--accent-soft-border')
    element.style.removeProperty('--surface')
    element.style.removeProperty('--surface-raised')
    element.dataset.persona = ''
    return
  }

  const h = persona.hue ?? deriveHue(persona.userRole, persona.aiRole)
  element.style.setProperty('--accent', oklch(0.48, 0.13, h))
  element.style.setProperty('--accent-hover', oklch(0.42, 0.14, h))
  element.style.setProperty('--accent-pressed', oklch(0.37, 0.14, h))
  element.style.setProperty('--accent-soft', oklch(0.9, 0.05, h))
  element.style.setProperty('--accent-soft-border', oklch(0.78, 0.07, h))
  element.style.setProperty('--surface', oklch(0.945, 0.028, h))
  element.style.setProperty('--surface-raised', oklch(0.975, 0.018, h))
  element.dataset.persona = `${persona.userRole}|${persona.aiRole}`
}
