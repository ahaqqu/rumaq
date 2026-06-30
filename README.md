# RumaQ

RumaQ is a household shopping and inventory assistant. It knows what you have at home, where it's stored, how many days are left, and when it expires. From receipt history, RumaQ puts together a per-store shopping plan so you only need one trip.

---

## For users

### What RumaQ can do

1. **Track stock without manual entry.**<br>
   Just snap a photo of your receipt; RumaQ reads the items, quantities, prices, and store. Stock updates automatically.

2. **Know what's running out.**<br>
   The home page shows items nearing expiry or expected to run out within 3 days.

3. **Per-store shopping plans.**<br>
   AI groups your needs by store. Just check off what you've bought.

4. **Assistant always nearby.**<br>
   The "Ask the assistant" button is in the corner of the screen. Ask for plans, recipes to use up stock, or store recommendations.

5. **Role personalisation.**<br>
   In **Settings**, you can set "I am ... You are ..." and tap **Apply**. For example: *"I am the king, you are the warrior"*. The app copy and the assistant's tone adapt accordingly — like a warrior reporting to their king. The theme colour changes too.

### Getting started

1. Open the app in a browser and sign in with your Google account.
2. Add your AI key of choice in **Settings** (OpenAI, Gemini, Anthropic, or OpenCode). Without a key, AI features are disabled but the inventory still works.
3. Snap your first receipt via the **Add from receipt** menu.
4. Check the home page for items that need attention and ask the assistant to make a shopping plan.

---

## For developers

### Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite, deployed to Cloudflare Pages |
| Backend | Cloudflare Workers + Hono |
| Database | Cloudflare D1 (SQLite) |
| File storage | Cloudflare R2 for receipt images |
| Auth | Google OAuth 2.0 with JWT cookie sessions |
| AI | Proxy to user's chosen model (BYO key) |

Fits comfortably within Cloudflare's free tier: Pages, Workers, D1, and R2 all have generous limits for dozens of active users.

### Repo structure

```
src/                  # React SPA
  pages/              # Home, Inventory, Plan, History, Settings
  components/         # AppShell, Assistant, UI primitives
  lib/                # Client API, persona engine, helpers
  styles/             # Design tokens & components
worker/               # Cloudflare Workers backend
  src/                # Hono routes, auth, middleware
  migrations/         # D1 schema migrations
scripts/              # Setup and utility scripts
docs/                 # Architecture & API docs
```

### Prerequisites

- Node.js 20+
- Cloudflare account
- Google Cloud project with OAuth 2.0 credentials
- Wrangler CLI (`npm install -g wrangler`) and authenticated (`wrangler login` or `export CLOUDFLARE_API_TOKEN=...`)

### Local setup (database + dependencies)

One command, whether from a *clean checkout* or an *update*:

```bash
./scripts/deploy.sh local
```

What it does:
- Creates `worker/wrangler.toml` from the example (with local defaults)
- Creates `worker/.dev.vars` template for local secrets
- `npm install` in root and worker
- Sets up local D1 database + schema migration
- Builds the frontend

> Edit `worker/.dev.vars` with real secrets (Google OAuth, JWT secret, encryption key) before running the dev server.

### Run the dev servers

Both (frontend + backend) start with a single command:

```bash
./scripts/deploy.sh dev
```

### Deploy to Cloudflare

```bash
# First time: create database + R2 + deploy Worker + Pages
./scripts/deploy.sh cloudflare

# Update (idempotent)
./scripts/deploy.sh cloudflare

# All at once (local + Cloudflare)
./scripts/deploy.sh

# Dry-run: build only, no deploy
./scripts/deploy.sh dry-run
```

> `./scripts/deploy.sh cloudflare` will prompt for `account_id` and create the D1 database + R2 bucket if they don't exist. After deploying, set production secrets via `cd worker && wrangler secret put <NAME>`.

### Further docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — full-stack architecture, auth flow, and free-tier limits.
- [`docs/API.md`](docs/API.md) — REST API endpoint contract.
- [`worker/migrations/0001_schema.sql`](worker/migrations/0001_schema.sql) — D1 database schema.

### Role personalisation (persona)

The persona feature changes:

- **UI copy:** lead text and instructions on every page are rewritten by AI based on the free-form role you enter.
- **AI prompt:** the assistant's system prompt includes the chosen role.
- **Theme colour:** the theme hue is derived from the role pair so each persona has a unique visual identity.

How it works: enter your roles in **Settings**, tap **Apply**. If an AI key is available, the AI is called once to rewrite all app copy. Results are cached; refreshing or logging out/in won't call AI again. Without an AI key, the persona still works with a built-in fallback style based on the detected role.

The persona logic lives in `src/lib/persona.js` and is managed through `PersonaContext`. During prototyping, settings are stored in `localStorage`; in production they sync with `GET /api/settings` and `PATCH /api/settings`.

### Internationalisation (i18n)

All user-facing text is managed through **react-i18next**. English is the default; Indonesian is built in. The architecture supports any future locale.

#### Translation files

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

#### How to add a new locale

1. Create `src/i18n/locales/{code}.json` — translate every key from `en.json`
2. Add it to `src/i18n/index.js`:
   ```js
   import xx from './locales/{code}.json'
   // add to resources: { en: { translation: en }, id: { translation: id }, xx: { translation: xx } }
   ```
3. It appears automatically in the Settings language switcher (Display section)

#### Persona & i18n

The persona engine reads base text from the current locale's translations. Mood wrappers (e.g. "Your Majesty {user}...", "Yang Mulia {user}...") are also locale-aware and defined in `persona.mood.*` keys. The AI generation prompt is sent in the current locale's language.

#### Usage in components

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
