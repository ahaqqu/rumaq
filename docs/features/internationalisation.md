# Internationalisation (i18n)

All user-facing text is managed through **react-i18next**. English is the default; Indonesian is built in. The architecture supports any future locale.

## Translation files

```
src/i18n/
  index.js          # i18next initialisation, language persistence
  locales/
    en.json         # English strings (default, ~200 keys)
    id.json         # Indonesian strings (~200 keys)
```

Translation keys are grouped by component:

| Prefix | Content |
|---|---|
| `nav.*` | Navigation and page titles |
| `home.*` | Home page |
| `inventory.*` | Inventory page |
| `addReceipt.*` | Add from receipt flow |
| `plan.*` | Shopping plan page |
| `history.*` | Purchase history |
| `settings.*` | Settings page |
| `assistant.*` | Assistant panel |
| `ui.*` | Shared UI component strings |
| `common.*` | Shared utility strings (dates, counts) |
| `data.*` | Default location/store labels |
| `persona.*` | Persona engine base text, mood wrappers, system prompts |

## How to add a new locale

1. Create `src/i18n/locales/{code}.json` — translate every key from `en.json`
2. Add it to `src/i18n/index.js`:
   ```js
   import xx from './locales/{code}.json'
   // add to resources: { en: { translation: en }, id: { translation: id }, xx: { translation: xx } }
   ```
3. It appears automatically in the Settings language switcher (Display section)

## Persona & i18n

The persona engine reads base text from the current locale's translations. Mood wrappers (e.g. "Your Majesty {user}...", "Yang Mulia {user}...") are also locale-aware and defined in `persona.mood.*` keys. The AI generation prompt is sent in the current locale's language.

## Usage in components

```jsx
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation()
  return <p>{t('home.stockStatus')}</p>
}
```

For persona-personalised text, pass `t` to `personaText()`:

```js
personaText('homeLead', persona, t)
```
