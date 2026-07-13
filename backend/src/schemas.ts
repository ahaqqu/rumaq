import {
  strictObject,
  object,
  string,
  picklist,
  boolean,
  number,
  optional,
  pipe,
  minLength,
  maxLength,
} from 'valibot'

export const settingsPatchSchema = strictObject({
  ai_provider: optional(
    picklist(['opencode', 'openai', 'anthropic', 'gemini'])
  ),
  ai_key: optional(pipe(string(), minLength(1))),
  persona_user_role: optional(string()),
  persona_ai_role: optional(string()),
  persona_enabled: optional(boolean()),
  motion_preference: optional(picklist(['none', 'reduced', 'standard'])),
  language: optional(picklist(['id', 'en'])),
  theme_hue: optional(number()),
})

export const locationSchema = object({
  label: pipe(string(), minLength(1), maxLength(100)),
})

export const storeSchema = object({
  label: pipe(string(), minLength(1), maxLength(100)),
})

export const aiKeyTestSchema = object({
  provider: picklist(['opencode', 'openai', 'anthropic', 'gemini']),
  key: optional(pipe(string(), minLength(1))),
})
