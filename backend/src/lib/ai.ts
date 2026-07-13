export type ParsedItem = {
  name: string
  qty: number
  unit: string
  price: number
  total?: number
}

export type ScanResult = {
  store_name?: string
  date?: string
  items: ParsedItem[]
}

function buildPrompt(): string {
  return `You are a receipt OCR assistant. Extract line items from the receipt image.

Return ONLY valid JSON in this exact format:
{
  "store_name": "Name of store (if visible)",
  "date": "Purchase date in YYYY-MM-DD format (if visible)",
  "items": [
    { "name": "Item name", "qty": 1, "unit": "pcs", "price": 10000 }
  ]
}

Rules:
- Extract every item line from the receipt.
- qty must be a number (default 1 if not specified).
- unit should be the unit of measurement (pcs, kg, L, pack, etc).
- price is the unit price or line total in the local currency (integer).
- Omit subtotals, taxes, and total lines.
- If you cannot read the receipt clearly, return { "items": [] }.
- Do NOT include any text outside the JSON.`
}

type OpenAIResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

type AnthropicResponse = {
  content?: Array<{
    text?: string
  }>
}

type OpenCodeResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

async function callOpenAI(
  apiKey: string,
  imageData: string
): Promise<ScanResult> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildPrompt() },
            { type: 'image_url', image_url: { url: imageData } },
          ],
        },
      ],
      max_tokens: 2000,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenAI OCR failed: ${res.status} ${body}`)
  }

  const data = (await res.json()) as OpenAIResponse
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI returned empty response')

  return parseJsonResponse(content)
}

async function callGemini(
  apiKey: string,
  imageData: string
): Promise<ScanResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: buildPrompt() },
              {
                inline_data: {
                  mime_type: imageData.startsWith('data:')
                    ? imageData.split(';')[0].replace('data:', '')
                    : 'image/jpeg',
                  data: imageData.startsWith('data:')
                    ? imageData.split(',')[1]
                    : imageData,
                },
              },
            ],
          },
        ],
      }),
    }
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Gemini OCR failed: ${res.status} ${body}`)
  }

  const data = (await res.json()) as GeminiResponse
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!content) throw new Error('Gemini returned empty response')

  return parseJsonResponse(content)
}

async function callAnthropic(
  apiKey: string,
  imageData: string
): Promise<ScanResult> {
  const mediaType = imageData.startsWith('data:')
    ? imageData.split(';')[0].replace('data:', '')
    : 'image/jpeg'
  const data = imageData.startsWith('data:')
    ? imageData.split(',')[1]
    : imageData

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildPrompt() },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data,
              },
            },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Anthropic OCR failed: ${res.status} ${body}`)
  }

  const result = (await res.json()) as AnthropicResponse
  const content = result.content?.[0]?.text
  if (!content) throw new Error('Anthropic returned empty response')

  return parseJsonResponse(content)
}

async function callOpenCode(
  apiKey: string,
  imageData: string
): Promise<ScanResult> {
  const res = await fetch('https://api.opencode.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'opencode-vision',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildPrompt() },
            { type: 'image_url', image_url: { url: imageData } },
          ],
        },
      ],
      max_tokens: 2000,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenCode OCR failed: ${res.status} ${body}`)
  }

  const data = (await res.json()) as OpenCodeResponse
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenCode returned empty response')

  return parseJsonResponse(content)
}

function parseJsonResponse(content: string): ScanResult {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('AI response did not contain valid JSON')
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>

    const items: ParsedItem[] = (
      (parsed.items || []) as Record<string, unknown>[]
    ).map((it) => ({
      name: String(it.name || ''),
      qty: Number(it.qty) || 1,
      unit: String(it.unit || 'pcs'),
      price: Math.round(Number(it.price) || 0),
      total: it.total ? Math.round(Number(it.total)) : undefined,
    }))

    return {
      store_name: parsed.store_name ? String(parsed.store_name) : undefined,
      date: parsed.date ? String(parsed.date) : undefined,
      items,
    }
  } catch {
    throw new Error('Failed to parse AI response JSON')
  }
}

function toDataUri(imageData: ArrayBuffer, type: string): string {
  const base64 = arrayBufferToBase64(imageData)
  return `data:${type};base64,${base64}`
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export async function extractReceiptItems(
  imageBuffer: ArrayBuffer,
  imageType: string,
  provider: string,
  apiKey: string
): Promise<ScanResult> {
  const imageData = toDataUri(imageBuffer, imageType)

  switch (provider) {
    case 'openai':
      return callOpenAI(apiKey, imageData)
    case 'gemini':
      return callGemini(apiKey, imageData)
    case 'anthropic':
      return callAnthropic(apiKey, imageData)
    case 'opencode':
      return callOpenCode(apiKey, imageData)
    default:
      throw new Error(`Unsupported AI provider: ${provider}`)
  }
}
