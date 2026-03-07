# 🚦 Dishub Portal — Bidang Lalu Lintas Jalan

Portal digital Dinas Perhubungan untuk pengelolaan informasi lalu lintas, pengaduan masyarakat, dan administrasi internal.

---

## Fitur

### Portal Publik (`index.html`)
- Profil instansi, bidang, dan struktur organisasi
- Informasi rekayasa lalu lintas aktif (real-time dari server)
- Pengumuman terbaru (real-time dari server)
- Alur pelayanan dan persyaratan per jenis izin
- Formulir pengaduan masyarakat dengan nomor tiket otomatis
- Cek status tiket pengaduan
- Download formulir per kategori (real-time dari server)

### Dashboard Admin (`dishub-admin.html`)
- **Dashboard** — statistik pengaduan, grafik per kategori & status
- **Pengaduan** — tabel lengkap, filter, paginasi, modal detail, ubah status
- **Rekayasa Lalu Lintas** — CRUD rekayasa aktif (urgent / info / normal)
- **Pengumuman** — CRUD pengumuman instansi
- **Download Manager** — kelola file formulir per kategori
- **Pengguna** — daftar & tambah pengguna admin
- **Laporan & Ekspor** — statistik + ekspor CSV
- **Pengaturan** — data instansi, jam operasional, ganti password

---

## Struktur Proyek

```
dishub/
├── index.html          # Portal publik
├── dishub-admin.html   # Dashboard admin
├── login.html          # Halaman login admin
├── server.js           # Backend Express + REST API
├── package.json
├── vercel.json         # Konfigurasi deploy Vercel
└── data/               # Penyimpanan JSON lokal (dibuat otomatis)
    ├── pengaduan.json
    ├── rekayasa.json
    ├── pengumuman.json
    ├── files.json
    ├── settings.json
    └── users.json
```

---

## Penyimpanan Data

| Lingkungan | Storage | Keterangan |
|------------|---------|------------|
| **Lokal** | JSON file (`data/*.json`) | Dibuat otomatis saat server pertama kali jalan |
| **Vercel** | Upstash Redis | Persistent, terdeteksi otomatis via env var `UPSTASH_REDIS_REST_URL` |

Server mendeteksi backend secara otomatis:
- Jika `UPSTASH_REDIS_REST_URL` **ada** → pakai Redis
- Jika **tidak ada** → pakai JSON file

---

## Menjalankan Secara Lokal

### Prasyarat
- Node.js >= 18.x
- npm

### Langkah

```bash
# 1. Install dependensi
npm install

# 2. Jalankan server
npm start

# 3. Buka di browser
#    Portal publik  → http://localhost:3000
#    Login admin    → http://localhost:3000/login.html
#    Dashboard      → http://localhost:3000/dishub-admin.html
```

> **Mode development** (auto-restart saat file berubah):
> ```bash
> npm run dev
> ```
> Membutuhkan Node.js >= 18.11 (built-in `--watch`).

Folder `data/` dan semua file JSON dibuat otomatis saat server pertama kali dijalankan, lengkap dengan data contoh bawaan.

---

## Kredensial Default

| Akun  | Password  |
|-------|-----------|
| Admin | `admin123` |

> Password dapat diubah melalui **Pengaturan → Ganti Password** di dashboard admin.

---

## Deploy ke Vercel (dengan Persistent Storage)

### Langkah 1 — Persiapkan Repository

```bash
git init
git add .
git commit -m "initial commit"
```

Push ke GitHub / GitLab / Bitbucket.

### Langkah 2 — Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) → **Add New Project**
2. Import repository Git Anda
3. Biarkan semua pengaturan default → klik **Deploy**

### Langkah 3 — Tambahkan Upstash Redis (Storage Permanen)

> Ini adalah langkah **wajib** agar data tersimpan permanen di Vercel.

1. Buka dashboard proyek Anda di Vercel
2. Klik tab **Storage**
3. Klik **Connect Store** → pilih **Upstash Redis** → **Continue**

   ![Vercel Storage Tab](https://vercel.com/_next/image?url=%2Fapi%2Fscreenshot%3Furl%3Dhttps%3A%2F%2Fvercel.com&w=1200&q=75)

4. Jika belum punya akun Upstash, klik **Create and Continue** — akan dibuat otomatis (gratis)
5. Pilih region terdekat (Singapore / `ap-southeast-1` untuk Indonesia)
6. Klik **Create** → **Connect**

   Vercel akan otomatis menambahkan environment variables berikut ke proyek:
   ```
   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=xxxxx
   ```

### Langkah 4 — Redeploy

Setelah Redis terhubung, trigger redeploy agar env vars aktif:

```bash
# Via Vercel CLI
npm install -g vercel
vercel --prod

# Atau klik "Redeploy" di dashboard Vercel
```

### Langkah 5 — Verifikasi

Buka URL Vercel Anda dan coba:
- Portal publik tampil dengan data rekayasa & pengumuman
- Login admin berhasil dengan password `admin123`
- Tambah pengaduan → refresh halaman → data tetap ada ✅

---

## Cara Kerja Upstash Redis

Data disimpan dengan prefix key `dishub:` di Redis:

| Key Redis | Isi |
|-----------|-----|
| `dishub:pengaduan` | Array JSON semua pengaduan |
| `dishub:rekayasa` | Array JSON rekayasa lalu lintas |
| `dishub:pengumuman` | Array JSON pengumuman |
| `dishub:files` | Array JSON file download |
| `dishub:users` | Array JSON pengguna |
| `dishub:settings` | Object JSON pengaturan |

**Auto-seed:** Saat key belum ada di Redis (deployment pertama), server otomatis mengisi data bawaan pada akses pertama — tidak perlu konfigurasi tambahan.

---

## REST API

Base URL: `http://localhost:3000` (lokal) atau `https://your-app.vercel.app` (Vercel)

### Autentikasi Admin
| Method | Endpoint     | Body                    | Keterangan     |
|--------|--------------|-------------------------|----------------|
| POST   | `/api/login` | `{ "password": "…" }` | Login admin    |

### Sumber Data Array
Berlaku untuk: `pengaduan` · `rekayasa` · `pengumuman` · `files` · `users`

| Method | Endpoint               | Keterangan                 |
|--------|------------------------|----------------------------|
| GET    | `/api/:resource`       | Ambil semua data           |
| POST   | `/api/:resource`       | Tambah satu item           |
| PUT    | `/api/:resource`       | Ganti seluruh array (bulk) |
| PUT    | `/api/:resource/:id`   | Update satu item           |
| DELETE | `/api/:resource/:id`   | Hapus satu item            |
| POST   | `/api/:resource/reset` | Reset ke data bawaan       |
| POST   | `/api/:resource/clear` | Hapus semua data           |

### Pengaturan
| Method | Endpoint              | Keterangan           |
|--------|-----------------------|----------------------|
| GET    | `/api/settings`       | Ambil pengaturan     |
| PUT    | `/api/settings`       | Perbarui pengaturan  |
| POST   | `/api/settings/reset` | Reset ke default     |

### Auto-ID Tiket Pengaduan
POST ke `/api/pengaduan` tanpa `id` → server auto-generate:
```
TKT-{TAHUN}-{NNN}    contoh: TKT-2026-048
```

---

## Environment Variables

| Variable | Keterangan | Wajib |
|----------|------------|-------|
| `UPSTASH_REDIS_REST_URL` | URL REST API Upstash Redis | Hanya di Vercel |
| `UPSTASH_REDIS_REST_TOKEN` | Token autentikasi Upstash | Hanya di Vercel |
| `PORT` | Port server lokal (default: `3000`) | Tidak |

---

## Tech Stack

| Komponen  | Teknologi |
|-----------|-----------|
| Backend   | Node.js 18+ + Express |
| Storage lokal | JSON file (`fs.readFileSync/writeFileSync`) |
| Storage cloud | Upstash Redis via `@upstash/redis` |
| Frontend  | HTML5 + CSS3 + Vanilla JavaScript |
| Font      | Inter, DM Mono (Google Fonts) |
| Deploy    | Vercel (serverless) |

---

## Limit Upstash Redis (Free Tier)

| Fitur | Limit |
|-------|-------|
| Request/hari | 10.000 |
| Data storage | 256 MB |
| Bandwidth/bulan | 100 MB |

Lebih dari cukup untuk portal pemerintah skala kecil-menengah.

---

## Lisensi

Proyek ini dibuat untuk keperluan internal Dinas Perhubungan.
