# rumaq — design brief

Working product name `rumaq`, taken from the repo. Replace if a final name lands.

## Register

**Product.** rumaq is a daily-use instrument, not a marketing surface. It earns trust through consistency, calm, and speed. A household member opens it between tasks, often one-handed, often mid-shopping. The interface must let them move without thinking. Brand-level art direction is not in scope for MVP.

## What rumaq is

A household grocery inventory and buying assistant. It knows what is in stock, where it is stored, how much is left, when it expires, and where it was bought. From purchase history it estimates when items will run out and builds shopping plans grouped by store and trip. The user brings their own AI API key; the app uses AI to capture, estimate, and plan, with an always-present trigger to ask it for help.

## Users and context

- **Primary user:** the household member who buys and tracks groceries. Often busy, often on mobile, often doing this in the kitchen or in a store aisle.
- **State they are in:** low attention, low patience for data entry. They will abandon anything that feels like bookkeeping.
- **Hard constraint stated by the user:** manually deducting stock after use is "too bother for people." This is the single most important design constraint. The product must infer consumption; it must never make logging-from-scratch the default path.
- **MVP scale:** ~10 users, single household per account. No multi-tenant UI complexity needed. No social, no sharing for MVP.

## The job, by surface

Each surface has one dominant work pattern. Future design work must respect the dominant pattern and not collapse every screen into a card grid.

| Surface | Dominant pattern | What the user does here |
|---|---|---|
| Home / overview | **Monitor** | See what is low, what expires soon, what is about to run out, today's suggested trip |
| Inventory | **Explore** + **Compare** | Search and filter stock by storage location, scan quantity and expiry at a glance |
| Add stock (receipt) | **Operate** | Photograph a receipt; review what the AI parsed; confirm or correct |
| Shopping plan | **Decide** | Accept, edit, or reject an AI-proposed plan: what to buy, where, grouped into one trip per store |
| Purchase history | **Compare** + **Learn** | Scan past buys, prices, cadence; trust the run-out estimates |
| Settings | **Configure** | Add and manage BYO AI API keys; storage locations; preferences |

## Domain artifacts

The real objects the UI presents, not abstract "data":

- **Stock item:** name, storage location, quantity + unit, expiry date or "no expiry", purchase source, run-out estimate.
- **Storage location:** a first-class concept (fridge, freezer, pantry, cupboard). Filtering and grouping by location is core, not an afterthought.
- **Purchase record:** item, quantity, price, store, date. The substrate for every estimate.
- **Shopping plan:** a proposed set of items grouped by store into executable trips, each with a "why" (running out, expiring, routine).
- **Run-out estimate:** a derived signal, e.g. "~3 days, based on your last 4 weeks." Always show the basis so it is trustworthy, not magical.

## Voice and feel

Clear and calm, like an assistant that is ready to help anytime but never demands attention. Concrete words: quiet, unhurried, reliable, sky-on-a-clear-morning. The surface stays mostly still; emphasis appears only where a decision actually waits. No urgency theatre.

Copy rules (apply to all surfaces):

- Sentence case everywhere. No exclamation points.
- One verb per button. "Add from receipt", "Plan this week", "Mark as bought". Never OK, Confirm, Yes.
- Estimates state their basis in plain words. "Runs out in ~3 days (last 4 weeks)" not "Low stock".
- Empty states teach the next action, not just label the void.
- Errors name what broke and what to do next; never blame the user.

## AI-assist lanes

The user brings their own API key (e.g. OpenCode) and triggers AI explicitly. AI is an assistant the user summons, not a background oracle that acts on its own. Confirmed lanes:

1. **Receipt → stock.** Photograph a receipt; AI parses items, quantities, prices, store, date; user confirms. This is the primary add path.
2. **Plan a trip.** From low-stock + run-out estimates, AI proposes a shopping plan grouped by store and trip. User accepts or edits.
3. **Recommend where to buy.** From purchase history (and, later, haqita cheapest-product data) AI suggests the store for each item.

Lanes to explore next (user asked for recommendations):

4. **Use-it-up nudge.** When items near expiry, AI suggests recipes or pairings that use them, to cut waste.
5. **Consumption calibration.** AI learns each household's depletion rate per item and flags when actual use drifts from the estimate, so run-out math gets sharper over time.
6. **Natural-language quick add.** "Bought 2L milk from Indomaret" parsed into a purchase + stock update for cases without a receipt.
7. **Trip optimization.** AI groups a plan so one trip covers one location and one time, minimizing store visits.
8. **Price memory.** Receipts build a price history per store, so plans can project cost and (with haqita) flag the cheaper option.

A trigger for AI help is always reachable (see Component rules). It is never buried in a settings menu.

## Anti-references — what rumaq must not be

- Not a spreadsheet or CRUD inventory where typing and manual deduction are the default. If a design makes the user log consumption by hand, it is wrong.
- Not a corporate warehouse-management UI. No dense admin tables, no jargon, no "SKU" language.
- Not generic SaaS: no blue-violet CTAs, no purple-to-cyan gradients, no centered hero card grid reflex.
- Not naggy. No recurring prompts to "log that you used X." Inference, not surveillance.
- Not a chatbot that takes over. The assistant proposes; the user decides. AI output is always presented for accept or edit, never auto-applied to stock without confirmation.

## Design principles

1. **Infer over ask.** The system observes purchases and time, then estimates. The user confirms or corrects; they never log from scratch.
2. **One-tap capture.** Receipt photo is the primary add path. Typing is the fallback, not the default.
3. **The assistant is always present.** A single, persistent trigger to ask AI for a plan or recommendation, reachable from anywhere. Never more than one tap away.
4. **Calm by default, urgent only when it matters.** Expiry and run-out warnings use restrained emphasis. The surface stays quiet otherwise.
5. **Confirm, don't configure.** AI proposals come as quick accept-or-edit suggestions, not as settings to tune.
6. **Plans are executable.** A shopping plan groups items by store into trips a person can actually run in one go.

## Accessibility

- Focus rings: 2-3px, offset, 3:1 contrast. Never `outline: none` without a replacement.
- Touch targets: minimum 44x44px (48x48 comfortable). The visual element may be small; the hit area must not be.
- Contrast: AA minimum, aim AAA for body text. Calm palette must not come at the cost of legibility.
- Motion: respect `prefers-reduced-motion`. Provide a path from no-motion to full.
- Mobile-first reachability: primary actions in the thumb zone; destructive actions harder to reach. iOS/Android are coming, so design as if touch is the default input even on web.
- Labels are always visible. Placeholders show format, never act as the only label.

## Visual foundation (directional, to be formalized by `/design recolor`)

Commitment level: **Whisper.** Near-neutral surface, one calm role color doing the work. The accent stays rare enough to mean something.

The accent is a calm sky blue, chosen because it is the product's stated mood ("clear, calm, light blue sky") and a real metaphor, not a generic tech hue. Build in OKLCH. Tint neutrals toward the sky hue with chroma well under 0.02 so gray surfaces feel authored. Clamp chroma at the lightness extremes.

Directional anchors (refine later, do not treat as final tokens):

- Surface: `oklch(0.98 0.012 230)`
- Surface raised: `oklch(0.995 0.008 230)`
- Border / hairline: `oklch(0.92 0.015 230)`
- Text primary: `oklch(0.26 0.02 235)`
- Text secondary: `oklch(0.52 0.02 235)`
- Accent (sky): `oklch(0.62 0.11 230)` — used for the AI trigger and primary actions only
- Accent hover / pressed: `oklch(0.55 0.13 230)`
- Warning (near expiry): `oklch(0.74 0.14 65)` amber, sparingly
- Danger (expired): `oklch(0.6 0.16 25)` muted red, sparingly

60-30-10: ~60% neutral surface, ~30% raised surface + text mass, ~10% sky accent. If the accent appears on more than ~10% of a screen, pull it back.

## Component rules (directional)

- **Stock item row:** name, storage-location chip, quantity + unit, expiry as "days left" signal, source. Scannable as a row, not a card pile.
- **Storage location:** first-class filter and grouping, not a free-text field.
- **Expiry:** shown as time-to ("3 days left"), with the raw date secondary. Expired and near-expiry get restrained color, not alarms.
- **Run-out estimate:** always paired with its basis ("based on last 4 weeks").
- **AI trigger:** one persistent control, reachable from any surface. Opens an assistant panel that proposes, then asks for accept or edit.
- **Shopping plan:** grouped by store, each group an executable trip; per-item accept/edit; one "mark as bought" to commit.
- **Receipt capture:** camera/upload first, parsed review second, confirm last. Never a blank form as step one.
- Avoid nested cards. Flatten with type and dividers where a card would hold a card.

## MVP scope and constraints

- Frontend: React + Vite.
- Deploy: Cloudflare free tier. Design for low-latency, local-first feel; assume the app should stay usable when a request is in flight (optimistic, loading states that name the work).
- Scale: ~10 users, single household. No multi-tenant or sharing UI for MVP.
- BYO AI: users add their own API key in Settings. The app must degrade gracefully when no key is set — core inventory still works; AI lanes show a clear "connect a key" state.
- Future (not MVP): haqita integration (https://github.com/ahaqqu/haqita, https://haqita.pages.dev) for cheapest-product planning. Design the plan surface so a price/cheapest column can be added without restructuring.

## Composition lanes allowed

- Monitor, Explore, Compare, Operate, Decide, Configure — per the surface table above.
- Not allowed as a default reflex: centered hero, repeated equal cards, pill-button clusters. Use them only where the work pattern genuinely calls for them.
