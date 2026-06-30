import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  DEFAULT_PERSONA,
  PERSONA_KEY,
  COPY,
  loadPersona,
  savePersona,
  personaText,
  deriveHue,
  speak,
  buildSystemPrompt,
  applyTheme,
  generatePersonaCopy,
} from './persona.js'

beforeEach(() => {
  localStorage.clear()
})

describe('loadPersona / savePersona', () => {
  it('returns DEFAULT_PERSONA when nothing is stored', () => {
    expect(loadPersona()).toEqual(DEFAULT_PERSONA)
  })

  it('round-trips a persona', () => {
    const p = { enabled: true, userRole: 'raja', aiRole: 'prajurit', hue: 270, generatedCopy: null }
    savePersona(p)
    const loaded = loadPersona()
    expect(loaded.userRole).toBe('raja')
    expect(loaded.enabled).toBe(true)
  })

  it('returns DEFAULT_PERSONA on corrupt localStorage', () => {
    localStorage.setItem(PERSONA_KEY, 'not-json')
    expect(loadPersona()).toEqual(DEFAULT_PERSONA)
  })
})

describe('deriveHue', () => {
  it('returns a hue in 0..359 for a given role pair', () => {
    const h = deriveHue('raja', 'prajurit')
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThan(360)
  })

  it('returns same hue for same role pair (deterministic)', () => {
    expect(deriveHue('raja', 'prajurit')).toBe(deriveHue('raja', 'prajurit'))
  })

  it('returns 230 for empty roles', () => {
    expect(deriveHue('', '')).toBe(230)
    expect(deriveHue()).toBe(230)
  })

  it('is case-insensitive', () => {
    expect(deriveHue('RAJA', 'PRAJURIT')).toBe(deriveHue('raja', 'prajurit'))
  })
})

describe('speak', () => {
  it('returns base text when persona is not enabled', () => {
    expect(speak('hello', { ...DEFAULT_PERSONA })).toBe('hello')
  })

  it('returns base text when roles are empty', () => {
    expect(speak('hello', { enabled: true, userRole: '', aiRole: '' })).toBe('hello')
  })

  it('servant-to-royal mood', () => {
    const p = { enabled: true, userRole: 'raja', aiRole: 'prajurit' }
    const result = speak('stok aman.', p)
    expect(result).toContain('Yang Mulia')
    expect(result).toContain('prajurit')
    expect(result).toContain('stok aman.')
  })

  it('student-to-teacher mood', () => {
    const p = { enabled: true, userRole: 'guru', aiRole: 'murid' }
    const result = speak('tugas selesai.', p)
    expect(result).toContain('Maaf mengganggu')
    expect(result).toContain('guru')
  })

  it('medical mood', () => {
    const p = { enabled: true, userRole: 'dokter', aiRole: 'pasien' }
    const result = speak('obat sudah diminum.', p)
    expect(result).toContain('Selamat datang')
  })

  it('employee-to-boss mood', () => {
    const p = { enabled: true, userRole: 'bos', aiRole: 'pegawai' }
    const result = speak('laporan siap.', p)
    expect(result).toContain('Izin melaporkan')
  })

  it('casual mood (teman)', () => {
    const p = { enabled: true, userRole: 'Andi', aiRole: 'teman' }
    const result = speak('gimana kabar?', p)
    expect(result).toContain('Hei')
  })

  it('generic fallback mood', () => {
    const p = { enabled: true, userRole: 'tamu', aiRole: 'host' }
    const result = speak('selamat datang.', p)
    expect(result).toContain('Halo')
    expect(result).toContain('tamu')
  })
})

describe('personaText', () => {
  it('returns base text when persona is not enabled', () => {
    expect(personaText('homeLead', DEFAULT_PERSONA)).toBe(COPY.homeLead)
  })

  it('returns AI-generated copy when available', () => {
    const p = {
      enabled: true,
      userRole: 'raja',
      aiRole: 'prajurit',
      hue: 270,
      generatedCopy: { homeLead: 'AI version' },
    }
    expect(personaText('homeLead', p)).toBe('AI version')
  })

  it('falls back to speak() when no AI copy', () => {
    const p = { enabled: true, userRole: 'raja', aiRole: 'prajurit', hue: 270, generatedCopy: null }
    const result = personaText('homeLead', p)
    expect(result).toContain('Yang Mulia')
    expect(result).toContain(COPY.homeLead)
  })
})

describe('buildSystemPrompt', () => {
  it('returns base prompt when persona is not enabled', () => {
    const p = buildSystemPrompt(DEFAULT_PERSONA)
    expect(p).toContain('RumaQ')
    expect(p).not.toContain('Bayangkan')
  })

  it('includes role instruction for enabled persona', () => {
    const p = buildSystemPrompt({ enabled: true, userRole: 'raja', aiRole: 'prajurit' })
    expect(p).toContain('Bayangkan')
    expect(p).toContain('raja')
    expect(p).toContain('prajurit')
  })
})

describe('applyTheme', () => {
  it('removes custom properties when persona is disabled', () => {
    const el = { style: { removeProperty: vi.fn() }, dataset: {} }
    applyTheme(DEFAULT_PERSONA, el)
    expect(el.style.removeProperty).toHaveBeenCalled()
    expect(el.dataset.persona).toBe('')
  })

  it('sets custom properties when persona is enabled', () => {
    const el = { style: { setProperty: vi.fn() }, dataset: {} }
    applyTheme({ enabled: true, userRole: 'raja', aiRole: 'prajurit', hue: 270 }, el)
    expect(el.style.setProperty).toHaveBeenCalledWith('--accent', expect.any(String))
    expect(el.dataset.persona).toBe('raja|prajurit')
  })
})

describe('generatePersonaCopy', () => {
  it('returns null when persona is not enabled', async () => {
    const result = await generatePersonaCopy(DEFAULT_PERSONA, 'sk-test', 'opencode')
    expect(result).toBeNull()
  })

  it('returns null when aiKey is missing', async () => {
    const p = { enabled: true, userRole: 'raja', aiRole: 'prajurit' }
    const result = await generatePersonaCopy(p, null, 'opencode')
    expect(result).toBeNull()
  })

  it('returns null when AI call fails', async () => {
    // Fetch will fail because there is no server — caught by the try/catch
    const p = { enabled: true, userRole: 'raja', aiRole: 'prajurit' }
    const result = await generatePersonaCopy(p, 'sk-invalid', 'opencode')
    expect(result).toBeNull()
  })
})
