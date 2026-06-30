/**
 * RumaQ persona engine.
 *
 * Users can declare "saya adalah X, kamu adalah Y". The UI then frames copy as
 * if the AI (the app) is role Y speaking to the user in role X, and the theme
 * shifts to a color derived from the role pair.
 */

export const PERSONA_KEY = 'rumaq:persona'

export const DEFAULT_PERSONA = {
  enabled: false,
  userRole: '',
  aiRole: '',
  hue: 230,
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
 * Derive a stable hue from the role pair so the same persona always produces
 * the same theme, while different pairs are visually distinct.
 */
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
  if ((u.includes('dokter') || u.includes('dokter')) && (a.includes('pasien') || a.includes('suster'))) {
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

/**
 * Rewrite a short piece of UI copy to fit the persona.
 */
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

/**
 * Build a system prompt fragment for the AI assistant.
 */
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

function oklch(l, c, h) {
  return `oklch(${l} ${c} ${h})`
}

/**
 * Apply the persona theme to CSS custom properties on the given element.
 */
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

  // Tint the neutral surfaces slightly toward the persona hue while keeping them calm.
  element.style.setProperty('--surface', oklch(0.945, 0.028, h))
  element.style.setProperty('--surface-raised', oklch(0.975, 0.018, h))
  element.dataset.persona = `${persona.userRole}|${persona.aiRole}`
}
