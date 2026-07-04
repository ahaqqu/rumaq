import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '../crypto.js'

const SECRET = 'test-encryption-key-12345'

describe('crypto', () => {
  it('encrypts and decrypts a string', async () => {
    const plaintext = 'hello world'
    const encrypted = await encrypt(plaintext, SECRET)
    const decrypted = await decrypt(encrypted, SECRET)
    expect(decrypted).toBe(plaintext)
  })

  it('produces different ciphertexts for same plaintext (random IV)', async () => {
    const a = await encrypt('same', SECRET)
    const b = await encrypt('same', SECRET)
    expect(a).not.toBe(b)
  })

  it('fails to decrypt with wrong key', async () => {
    const encrypted = await encrypt('secret data', SECRET)
    await expect(decrypt(encrypted, 'wrong-key')).rejects.toThrow()
  })

  it('fails to decrypt tampered ciphertext', async () => {
    const encrypted = await encrypt('test', SECRET)
    const tampered = encrypted.slice(0, -1) + 'A'
    await expect(decrypt(tampered, SECRET)).rejects.toThrow()
  })

  it('handles empty string', async () => {
    const encrypted = await encrypt('', SECRET)
    const decrypted = await decrypt(encrypted, SECRET)
    expect(decrypted).toBe('')
  })

  it('handles special characters and unicode', async () => {
    const plaintext = 'héllo 世界 🔑'
    const encrypted = await encrypt(plaintext, SECRET)
    const decrypted = await decrypt(encrypted, SECRET)
    expect(decrypted).toBe(plaintext)
  })

  it('base64url output has no padding, +, or /', async () => {
    const encrypted = await encrypt('test value', SECRET)
    expect(encrypted).not.toContain('=')
    expect(encrypted).not.toContain('+')
    expect(encrypted).not.toContain('/')
  })
})