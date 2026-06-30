# RumaQ — REST API Contract

Base URL: `https://api.rumaq.pages.dev/api`

All protected endpoints require the `rumaq_session` cookie issued by Google OAuth. Responses are JSON. Errors use `{ "error": "..." }`.

## Auth

### `GET /auth/me`
Returns the currently logged-in user.

**Response:**
```json
{
  "user": {
    "id": "u_...",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://..."
  }
}
```

### `GET /auth/login`
Redirects to Google OAuth 2.0 login.

### `GET /auth/callback`
Google OAuth callback. Sets the session cookie and redirects to `/`.

### `POST /auth/logout`
Clears the session cookie.

**Response:**
```json
{ "ok": true }
```

---

## Households

### `GET /households`
List households the current user belongs to.

**Response:**
```json
{
  "households": [
    { "id": "h_...", "name": "Rumahku", "role": "owner" }
  ]
}
```

### `POST /households`
Create a household.

**Body:**
```json
{ "name": "Rumahku" }
```

**Response:**
```json
{ "id": "h_...", "name": "Rumahku" }
```

### `PATCH /households/:id`
Update household name or set it as active.

**Body:**
```json
{ "name": "Rumah Baru", "active": true }
```

---

## Stock

### `GET /stock`
Current inventory for the active household.

**Query:** `?location=&q=`

**Response:**
```json
{
  "stock": [
    {
      "id": "s_...",
      "name": "Susu cair",
      "qty": 0.8,
      "unit": "L",
      "location": "Kulkas",
      "expiry_date": "2026-07-02",
      "run_out_days": 2,
      "basis": "4 minggu terakhir"
    }
  ]
}
```

### `PATCH /stock/:id`
Update quantity, location, or expiry of a stock item.

**Body:**
```json
{ "qty": 1.2, "location_id": "l_...", "expiry_date": "2026-07-05" }
```

---

## Purchases

### `GET /purchases`
Purchase history, grouped by month.

**Query:** `?store=&from=&to=`

**Response:**
```json
{
  "purchases": [
    {
      "id": "p_...",
      "date": "2026-06-28",
      "store": "Indomaret",
      "total": 90500,
      "items": [
        { "name": "Susu cair 1L", "qty": 1, "unit": "L", "price": 18500 }
      ]
    }
  ]
}
```

### `POST /purchases`
Record a confirmed purchase and update stock.

**Body:**
```json
{
  "store_id": "st_...",
  "date": "2026-06-28",
  "total": 90500,
  "items": [
    { "item_id": "i_...", "name": "Susu cair 1L", "qty": 1, "unit": "L", "price": 18500 }
  ]
}
```

### `POST /purchases/scan`
Upload a receipt image, run AI OCR, and return parsed line items.

**Body:** `multipart/form-data` with `receipt` (image) and optional `store_id`.

**Response:**
```json
{
  "store_id": "st_...",
  "date": "2026-06-28",
  "total": 90500,
  "items": [
    { "name": "Susu cair 1L", "qty": 1, "unit": "L", "price": 18500 }
  ]
}
```

---

## Plans

### `GET /plans`
List shopping plans.

**Query:** `?status=active`

**Response:**
```json
{
  "plans": [
    {
      "id": "pl_...",
      "status": "active",
      "total_estimate": 80500,
      "trips": [
        {
          "store": "Indomaret",
          "items": [
            { "name": "Susu cair 1L", "qty": 1, "unit": "L", "price_estimate": 18500, "why": "Hampir habis" }
          ]
        }
      ]
    }
  ]
}
```

### `POST /plans/generate`
Ask AI to generate a new shopping plan from current stock and history.

**Body:**
```json
{ "stores": ["st_..."] }
```

**Response:** a draft plan object.

### `POST /plans`
Save a generated plan as active.

**Body:** plan object.

**Response:** `{ "id": "pl_..." }`

### `PATCH /plans/:id/items/:itemId`
Mark a plan item as bought or skipped.

**Body:**
```json
{ "status": "bought" }
```

---

## Locations & Stores

### `GET /locations`
### `POST /locations`
### `DELETE /locations/:id`

### `GET /stores`
### `POST /stores`
### `DELETE /stores/:id`

Payloads are small lookup objects: `{ "id": "...", "label": "..." }`.

---

## Settings

### `GET /settings`
Get current user settings.

**Response:**
```json
{
  "motion_preference": "standard",
  "currency": "idr",
  "ai_provider": "gemini",
  "ai_key_set": true,
  "persona": {
    "enabled": true,
    "user_role": "raja",
    "ai_role": "prajurit",
    "theme_hue": 270
  }
}
```

### `PATCH /settings`
Update settings.

**Body:**
```json
{
  "motion_preference": "reduced",
  "currency": "idr",
  "ai_provider": "gemini",
  "ai_key": "...",
  "persona": {
    "enabled": true,
    "user_role": "raja",
    "ai_role": "prajurit"
  }
}
```

`ai_key` is encrypted by the Worker before storage. The `persona.theme_hue` is derived by the backend from the role pair when not supplied.

---

## AI Assistant

### `POST /ai/chat`
Send a message to the AI assistant.

**Body:**
```json
{
  "message": "Buatkan rencana belanja minggu ini"
}
```

**Response:** streamed SSE or JSON object with `reply` and `proposal`.

The system prompt includes the user's persona setting (e.g. "Kamu adalah prajurit yang sedang melaporkan kepada raja").

### `GET /ai/usage`
Returns today's AI usage meter.

**Response:**
```json
{ "provider": "gemini", "used": 17, "limit": 20 }
```
