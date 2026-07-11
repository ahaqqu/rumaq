export function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64UrlDecode(str: string): ArrayBuffer {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '='
  )
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
    .buffer as ArrayBuffer
}

export async function encryptAiKey(
  plainText: string,
  key: string
): Promise<string> {
  const encoder = new TextEncoder()
  const rawKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    rawKey,
    encoder.encode(plainText)
  )
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return `v1:${base64UrlEncode(combined)}`
}

export async function decryptAiKey(
  cipherText: string,
  key: string
): Promise<string> {
  if (!cipherText.startsWith('v1:')) {
    throw new Error('Unsupported encryption version')
  }
  const raw = cipherText.slice(3)
  const combined = new Uint8Array(base64UrlDecode(raw))
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)
  const encoder = new TextEncoder()
  const rawKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    rawKey,
    data
  )
  return new TextDecoder().decode(plain)
}
