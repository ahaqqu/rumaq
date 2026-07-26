const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/webp'])
const MAX_SIZE = 5 * 1024 * 1024

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/webp': 'webp',
}

export function validateImage(file: { type: string; size: number }): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'Unsupported file type. Accepted: JPEG, PNG, HEIC, WEBP.'
  }
  if (file.size > MAX_SIZE) {
    return 'File too large. Maximum size is 5 MB.'
  }
  return null
}

export function buildKey(householdId: string, userId: string, ext: string): string {
  const now = new Date()
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const uuid = crypto.randomUUID()
  return `receipts/${householdId}/${yyyy}/${mm}/${uuid}.${ext}`
}

export async function uploadReceipt(
  bucket: R2Bucket,
  image: ArrayBuffer,
  key: string,
  contentType: string
): Promise<R2Object> {
  return bucket.put(key, image, {
    httpMetadata: { contentType },
    customMetadata: { uploadedAt: new Date().toISOString() },
  })
}

export function getSignedUrl(): null {
  return null
}

export function extFromType(type: string): string {
  return EXT_MAP[type] || 'jpg'
}
