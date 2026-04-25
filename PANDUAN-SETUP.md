# 📖 Panduan Setup Dompet Bersama

Aplikasi manajemen keuangan rumah tangga untuk Anda dan istri.

---

## 🛠️ LANGKAH 1 — Setup Supabase (Backend & Database)

### 1.1 Buat Akun & Project Supabase
1. Buka **https://supabase.com** → Sign Up gratis
2. Klik **New Project**
3. Isi:
   - **Name:** `dompet-bersama` (bebas)
   - **Database Password:** buat password yang kuat (simpan!)
   - **Region:** Southeast Asia (Singapore)
4. Tunggu project selesai dibuat (~2 menit)

### 1.2 Jalankan SQL Schema
1. Di dashboard Supabase, klik **SQL Editor** (ikon di sidebar kiri)
2. Klik **New Query**
3. Buka file `supabase-schema.sql` dari folder project ini
4. Copy semua isinya → Paste ke SQL Editor
5. Klik **Run** (▶)
6. Pastikan muncul "Success. No rows returned"

### 1.3 Ambil API Keys
1. Klik **Settings** → **API**
2. Catat dua nilai ini:
   - **Project URL** (contoh: `https://abcdefgh.supabase.co`)
   - **anon public** key (string panjang di bawah "Project API keys")

---

## 🗂️ LANGKAH 2 — Konfigurasi Project

### 2.1 Buat file `.env`
Di folder project, buat file baru bernama `.env` (bukan `.env.example`):

```
VITE_SUPABASE_URL=https://XXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

Ganti dengan nilai asli dari Langkah 1.3.

---

## 💻 LANGKAH 3 — Jalankan Lokal (Opsional, untuk test)

```bash
# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Buka **http://localhost:5173** di browser.

---

## 🚀 LANGKAH 4 — Deploy ke Vercel (Gratis Selamanya)

### 4.1 Upload ke GitHub
1. Buat akun **https://github.com** jika belum punya
2. Buat repository baru, nama bebas, pilih **Private**
3. Upload semua file project ke repository tersebut
   - Bisa drag & drop lewat web GitHub
   - Atau pakai Git:
     ```bash
     git init
     git add .
     git commit -m "initial"
     git remote add origin https://github.com/USERNAME/REPO.git
     git push -u origin main
     ```

### 4.2 Deploy di Vercel
1. Buka **https://vercel.com** → Sign Up dengan GitHub
2. Klik **Add New → Project**
3. Pilih repository yang baru dibuat
4. Di bagian **Environment Variables**, tambahkan:
   - `VITE_SUPABASE_URL` = URL Supabase Anda
   - `VITE_SUPABASE_ANON_KEY` = Anon key Supabase Anda
5. Klik **Deploy**
6. Tunggu 1-2 menit → aplikasi live! ✅

Vercel akan memberikan URL gratis seperti: `https://dompet-bersama-xxx.vercel.app`

---

## 👥 LANGKAH 5 — Daftarkan 2 Akun

1. Buka aplikasi yang sudah live
2. Klik tab **Daftar**
3. Daftarkan akun pertama (misalnya: nama "Budi", email budi@gmail.com)
4. Logout
5. Daftarkan akun kedua (misalnya: nama "Siti", email siti@gmail.com)

Selesai! Sekarang kalian berdua bisa login dan mulai mencatat keuangan bersama.

---

## 📱 Fitur Aplikasi

| Fitur | Detail |
|-------|--------|
| **Dashboard** | Ringkasan bulan ini: saldo, pemasukan, pengeluaran, grafik |
| **Transaksi** | Catat & lihat semua transaksi, filter by kategori/orang/tanggal/rentang waktu |
| **Budget** | Set batas pengeluaran per kategori, lihat progress bar |
| **Kategori** | Kategori default + bisa tambah sendiri, pilih icon & warna |
| **Laporan** | Grafik harian, pie chart, akumulasi, per orang, top pengeluaran |
| **Multi-user** | Setiap transaksi terlihat siapa yang input |

---

## ❓ FAQ

**Q: Apakah data aman?**
A: Ya, Supabase menggunakan Row Level Security. Satu user hanya bisa edit/hapus data miliknya sendiri.

**Q: Apakah benar-benar gratis?**
A: Ya. Supabase free tier: 500MB database, 50.000 req/bulan. Vercel free tier: unlimited untuk project personal. Lebih dari cukup untuk 2 orang.

**Q: Bisa diakses dari HP?**
A: Ya, tampilan responsive. Buka di browser HP langsung.

**Q: Bagaimana kalau mau ganti nama di profil?**
A: Bisa lewat Supabase Dashboard → Table Editor → profiles.
