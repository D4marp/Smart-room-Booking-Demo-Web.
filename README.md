# Bookify Admin Web (Next.js)

Web admin dashboard untuk Bookify, terhubung ke backend Go melalui REST API + JWT.

## Fitur

- Login khusus `admin` / `superadmin`
- Dashboard statistik booking & room
- Kalender booking bulanan dengan aksi:
  - approve
  - reject
  - complete
  - cancel
- User management (khusus `superadmin`):
  - list user
  - create user
  - change role
  - delete user

## Menjalankan

1. Install dependency:

```bash
npm install
```

2. Buat file env:

```bash
cp .env.example .env.local
```

3. Jalankan development server:

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:3000`.

## Konfigurasi Backend

Pastikan backend Go berjalan, default:

- API base URL: `http://localhost:8080`
- Jika berbeda, ubah `NEXT_PUBLIC_API_BASE_URL` di `.env.local`

## Catatan CORS

Backend sudah memakai middleware CORS. Pastikan environment backend `ALLOWED_ORIGINS` mengizinkan origin web admin jika Anda tidak memakai `*`.
