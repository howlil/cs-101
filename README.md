# CS-101

Kerangka course pribadi: Astro + MDX, TypeScript, dan SQLite bawaan Node 24.

## Jalankan

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Gunakan Node 24 sesuai `.node-version`. Server dev bind ke `127.0.0.1:4321`. Halaman `/demo` memperlihatkan komponen lesson; demo tidak masuk curriculum atau progres.

```sh
pnpm test
pnpm check
pnpm build
pnpm start
```

`pnpm start` menjalankan hasil build pada host dan port yang sama. Jika port dev sedang dipakai, hentikan dev terlebih dahulu. `HOST` dan `PORT` dapat diatur untuk deployment private. Production membaca environment process; jika memakai `.env`, muat lewat service manager atau `node --env-file=.env scripts/start.mjs`.

## Deploy ke Cloudflare Pages lewat GitHub

1. Push repository ke GitHub, lalu di Cloudflare buka **Workers & Pages → Create application → Pages → Import an existing Git repository** dan pilih repository ini.
2. Isi build command `pnpm build:cloudflare`, build output directory `dist/client`, dan environment variable build `NODE_VERSION=24`.
3. Buat database D1 bernama `cs101-learning`. Pada project Pages, buka **Settings → Bindings**, tambahkan D1 binding dengan variable name `LEARNING_DB`, pilih database tersebut, lalu simpan.
4. Terapkan schema satu kali dari terminal yang sudah login ke Cloudflare:

   ```sh
   pnpm exec wrangler login
   pnpm exec wrangler d1 execute cs101-learning --remote --file=migrations/0001_initial.sql
   ```

5. Deploy ulang Pages. Setelah koneksi GitHub aktif, commit baru ke branch production akan memicu build dan deploy; pull request mendapat preview deployment.

Runtime Pages memakai Astro Cloudflare adapter dan D1 untuk progres dan riwayat. `pnpm dev`/`pnpm start` tetap memakai Node + `node:sqlite` lokal. Isi database D1 tidak ikut dibawa oleh GitHub.

## Yang sudah tersedia

- Halaman Hari ini, Progres, lesson dinamis, demo MDX, dan empty state review.
- Tema terang/gelap/sistem, navigasi responsif, reveal, kuis lokal, challenge, dan form sesi.
- Schema curriculum dengan validasi prerequisite, fingerprint, dan coverage metadata.
- Progres memakai SQLite lokal atau Cloudflare D1: satu task aktif, sesi append-only, bukti, kelulusan mandiri, dan ekspor JSON.
- API transaksi dengan revision conflict, idempotensi, validasi body, dan pemeriksaan Origin.

Belum tersedia: integrasi sumber curriculum, eksekusi generator otomatis, review engine/jadwal, pencarian isi, auth multiuser, dan backup otomatis. Checklist penerimaan pada dokumen desain tetap menjadi target implementasi, bukan klaim seluruh fitur sudah selesai.

## Menambah curriculum dan lesson

1. Isi `curriculum/manifest.json` sesuai `src/domain/curriculum.ts`. Task memiliki kriteria ber-ID unik; ID `challenge` digunakan untuk bukti challenge.
2. Pakai skill `.agents/skill/course-generator/SKILL.md` untuk menghasilkan satu lesson dan memeriksa sumbernya.
3. Simpan MDX di `src/content/lessons/`. Frontmatter: `taskId`, `title`, `description`, `curriculumFingerprint`. Demo menjadi acuan import komponen.
4. Dapatkan fingerprint dengan `pnpm exec tsx scripts/fingerprint.ts <TASK-ID>`; simpan metadata sesuai `generation/README.md`.
5. Jalankan validasi, check, dan build. Review isi serta sumber sebelum menerima MDX sebagai kode tepercaya.

Tidak ada task asli yang dibuat otomatis. Curriculum kosong memang menampilkan empty state. Task tanpa lesson tetap terlihat di Progres.

## Data dan API

Database default: `.data/learning.sqlite`, diabaikan Git. Atur `CS101_DB_PATH` ke path absolut pada disk persisten untuk production. Jangan menyimpan database di direktori `dist`. Ini aplikasi pribadi; autentikasi belum diimplementasikan.

| Route | Fungsi |
| --- | --- |
| `GET /api/learning` | State dan revision saat ini |
| `POST /api/active-task` | Aktifkan task; opsional simpan sesi task sebelumnya secara atomik |
| `POST /api/sessions` | Simpan progress atau kelulusan mandiri |
| `GET /api/export` | Unduh state dan riwayat sesi |

Mutasi memerlukan `Content-Type: application/json`, header `Origin` yang sama dengan server, UUID `requestId`, dan `revision` terakhir. Schema payload ada di `src/domain/learning/schema.ts`. Retry memakai ID dan payload yang sama. Conflict `409` memerlukan rekonsiliasi/reload; input tidak valid `422`. Snapshot kosong dimulai dari revision `0`.

Untuk private hostname, atur `CS101_ORIGIN` tepat ke origin aplikasi saat build dan runtime, lalu pasang autentikasi pada reverse proxy sebelum membuka akses. Uji header/protocol proxy sesuai hosting. Origin check bukan autentikasi. Server harus tetap satu instance dengan disk persisten. SQLite tidak cocok disimpan pada filesystem serverless sementara.

## Peta kode

```text
curriculum/              spesifikasi materi
generation/              sumber dan coverage lesson
migrations/              versi schema SQLite
src/content/lessons/     konten MDX
src/components/course/   komponen belajar
src/layouts/             shell halaman
src/domain/              schema dan aturan domain
src/server/              service, database, HTTP boundary
src/pages/               halaman Astro dan API
tests/                   transaksi, retry, restart, curriculum, HTTP
```

Desain UI: [.agents/design.md](.agents/design.md). Arsitektur target: [.agents/engineering-design.md](.agents/engineering-design.md).
