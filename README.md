# RumaQ

RumaQ adalah asisten belanja dan inventaris rumah tangga. Ia tahu apa yang ada di rumahmu, di mana disimpannya, perkiraan sisa berapa hari lagi, dan kapan kedaluwarsa. Dari riwayat struk, RumaQ menyusun rencana belanja per toko supaya kamu cukup sekali jalan.

---

## Untuk pengguna

### Apa yang bisa dilakukan RumaQ

1. **Pantau stok tanpa mencatat manual.**<br>
   Cukup foto struk belanja; RumaQ membaca item, jumlah, harga, dan toko. Stok bertambah otomatis.

2. **Tahu apa yang mau habis.**<br>
   Beranda menampilkan item yang mendekati kedaluwarsa atau perkiraan habis dalam 3 hari.

3. **Rencana belanja per toko.**<br>
   AI mengelompokkan kebutuhan berdasarkan toko. Kamu tinggal centang yang sudah dibeli.

4. **Asisten selalu dekat.**<br>
   Tombol "Tanya asisten" ada di sudut layar. Minta rencana, resep untuk menghabiskan stok, atau rekomendasi toko.

5. **Personalisasi peran.**<br>
   Di **Pengaturan**, kamu bisa mengatur "Saya adalah ... Kamu adalah ..." lalu tekan **Terapkan**. Misalnya: *"saya adalah raja, kamu adalah prajurit"*. Setelah itu teks di aplikasi dan cara asisten berbicara menyesuaikan — seperti prajurit yang melaporkan kepada rajanya. Warna tema juga ikut berubah sesuai peran.

### Cara mulai

1. Buka aplikasi di browser dan masuk dengan akun Google.
2. Tambahkan kunci AI pilihanmu di **Pengaturan** (OpenAI, Gemini, Anthropic, atau OpenCode). Tanpa kunci, fitur AI nonaktif tapi inventaris tetap bisa digunakan.
3. Foto struk belanja pertama melalui menu **Tambah dari struk**.
4. Lihat beranda untuk item yang butuh perhatian dan minta asisten membuatkan rencana belanja.

---

## Untuk pengembang

### Tech stack

| Lapisan | Teknologi |
|---|---|
| Frontend | React + Vite, deploy ke Cloudflare Pages |
| Backend | Cloudflare Workers + Hono |
| Database | Cloudflare D1 (SQLite) |
| File storage | Cloudflare R2 untuk gambar struk |
| Auth | Google OAuth 2.0 dengan sesi JWT cookie |
| AI | Proxy ke model pilihan pengguna (BYO key) |

Cocok untuk Cloudflare free tier: Pages, Workers, D1, dan R2 semua punya batas gratis yang lebih dari cukup untuk puluhan pengguna aktif.

### Struktur repo

```
src/                  # SPA React
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

### Prasyarat

- Node.js 20+
- Akun Cloudflare
- Proyek Google Cloud dengan OAuth 2.0 credentials
- Wrangler CLI (`npm install -g wrangler`) dan sudah login (`wrangler login`)

### Jalankan frontend lokal

```bash
npm install
npm run dev
```

Frontend berjalan di `http://localhost:5173`.

### Jalankan backend lokal

```bash
cd worker
cp wrangler.toml.example wrangler.toml
# isi account_id, database_id, dan secrets
npm install
npm run dev
```

### Setup database D1

```bash
cd worker
cp wrangler.toml.example wrangler.toml
# isi account_id dari dashboard Cloudflare
npm install
npm run db:create
# salin database_id yang muncul ke wrangler.toml, lalu
npm run db:migrate
```

### Deploy

```bash
# Deploy Worker + Pages sekaligus
npm run deploy

# Atau terpisah
npm run deploy:backend
npm run deploy:frontend

# Dry-run: build saja tanpa deploy
npm run deploy:dry-run
```

### Dokumen lebih lanjut

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arsitektur full-stack, alur auth, dan batas free tier.
- [`docs/API.md`](docs/API.md) — kontrak endpoint REST API.
- [`worker/migrations/0001_schema.sql`](worker/migrations/0001_schema.sql) — skema database D1.

### Personalisasi peran (persona)

Fitur persona mengubah:

- **Salinan UI:** lead text dan petunjuk di setiap halaman ditulis ulang oleh AI berdasarkan peran bebas yang kamu masukkan.
- **Prompt AI:** system prompt asisten menyertakan peran yang dipilih.
- **Tema warna:** hue tema dihasilkan dari pasangan peran sehingga setiap persona punya identitas visual unik.

Cara kerja: masukkan peran di **Pengaturan**, tekan **Terapkan**. Jika kunci AI tersedia, AI dipanggil sekali untuk menulis ulang semua teks aplikasi. Hasilnya dicache; refresh atau logout-login tidak memanggil AI lagi. Tanpa kunci AI, persona tetap aktif dengan gaya bawaan (fallback) berdasarkan peran yang dikenali.

Logika persona tinggal di `src/lib/persona.js` dan diatur melalui `PersonaContext`. Saat prototype, pengaturan disimpan di `localStorage`; di produksi disinkronkan dengan endpoint `GET /api/settings` dan `PATCH /api/settings`.
