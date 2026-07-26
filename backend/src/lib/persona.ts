type PersonaSettings = {
  persona_enabled: number | null
  persona_user_role: string | null
  persona_ai_role: string | null
}

const BASE_SYSTEM_PROMPT =
  'You are RumaQ, a household inventory and shopping assistant. Answer clearly, concisely, and practically.'

const ROLE_INSTRUCTION_BASE =
  'Imagine you are {{ai}} and the user is {{user}}. Your entire response must match that role.'

const MOOD_INSTRUCTIONS: Record<string, string> = {
  'servant-to-royal': 'Use very respectful, polite language befitting a report to royalty.',
  'student-to-teacher': 'Use polite language like a student speaking to a teacher.',
  medical: 'Use calm, clear, and professional language.',
  'employee-to-boss': 'Use formal, concise language like a report to a superior.',
  casual: 'Use casual, friendly language.',
}

function normalize(role = ''): string {
  return role
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '')
}

function detectMood(userRole: string, aiRole: string): string {
  const u = normalize(userRole)
  const a = normalize(aiRole)
  if (/(raja|ratu|pangeran|putri|king|queen|prince|princess|majesty|lord|lad)/i.test(u))
    return 'servant-to-royal'
  if (/(guru|dosen|teacher|professor|lecturer|master|sensei)/i.test(u)) return 'student-to-teacher'
  if (/(dokter|doctor|physician|nurse)/i.test(u)) return 'medical'
  if (/(bos|manajer|manager|boss|ceo|director|supervisor|employer)/i.test(u))
    return 'employee-to-boss'
  if (/(teman|sahabat|bestie|friend|buddy|pal|mate)/i.test(a)) return 'casual'
  return 'generic'
}

export function buildSystemPrompt(persona: PersonaSettings | null): string {
  if (
    !persona ||
    !persona.persona_enabled ||
    !persona.persona_user_role ||
    !persona.persona_ai_role
  ) {
    return BASE_SYSTEM_PROMPT
  }
  const u = persona.persona_user_role
  const a = persona.persona_ai_role
  const mood = detectMood(u, a)
  const roleInstruction = ROLE_INSTRUCTION_BASE.replace('{{user}}', u).replace('{{ai}}', a)
  const moodInstruction = mood !== 'generic' ? ` ${MOOD_INSTRUCTIONS[mood] || ''}` : ''
  return `${BASE_SYSTEM_PROMPT} ${roleInstruction}${moodInstruction}`
}
