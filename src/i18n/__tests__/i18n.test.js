import { describe, it, expect } from 'vitest'
import en from '../locales/en.json'
import id from '../locales/id.json'

function flattenKeys(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [key, val]) => {
    const k = prefix ? `${prefix}.${key}` : key
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      acc.push(...flattenKeys(val, k))
    } else {
      acc.push(k)
    }
    return acc
  }, [])
}

describe('locale files', () => {
  it('en.json is a valid object', () => {
    expect(typeof en).toBe('object')
    expect(en).not.toBeNull()
  })

  it('id.json is a valid object', () => {
    expect(typeof id).toBe('object')
    expect(id).not.toBeNull()
  })

  it('en and id have the same top-level keys', () => {
    const enKeys = Object.keys(en).sort()
    const idKeys = Object.keys(id).sort()
    expect(enKeys).toEqual(idKeys)
  })

  it('en and id have the same flattened key structure', () => {
    const enFlat = flattenKeys(en).sort()
    const idFlat = flattenKeys(id).sort()
    expect(enFlat).toEqual(idFlat)
  })

  it('en contains all required top-level namespaces', () => {
    const expected = ['nav', 'home', 'inventory', 'addReceipt', 'plan', 'history', 'settings', 'assistant', 'ui', 'common', 'data', 'persona']
    for (const ns of expected) {
      expect(en).toHaveProperty(ns)
    }
  })

  it('all string values are non-empty', () => {
    function checkStrings(obj, path = '') {
      for (const [key, val] of Object.entries(obj)) {
        const p = path ? `${path}.${key}` : key
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          checkStrings(val, p)
        } else if (typeof val === 'string') {
          expect(val.trim(), `${p} should not be empty`).not.toBe('')
        }
      }
    }
    checkStrings(en)
    checkStrings(id)
  })
})

describe('i18n initialisation', () => {
  it('can dynamically import and initialise i18n', async () => {
    const mod = await import('../index.js')
    expect(mod.default).toBeDefined()
    expect(mod.default.language).toBe('en')
  })

  it('switches language and updates html lang attribute', async () => {
    const mod = await import('../index.js')
    mod.default.changeLanguage('id')
    await new Promise((r) => setTimeout(r, 50)) // wait for languageChanged event
    expect(document.documentElement.lang).toBe('id')
    // restore
    mod.default.changeLanguage('en')
    await new Promise((r) => setTimeout(r, 50))
    expect(document.documentElement.lang).toBe('en')
  })
})
