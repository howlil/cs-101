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

## Deploy ke Cloudflare Workers lewat GitHub

Cloudflare memakai `wrangler.jsonc` sebagai source of truth. Build Astro menghasilkan Worker di `dist/_worker.js/index.js` dan static assets di `dist`; D1 tersedia sebagai binding `LEARNING_DB`.

1. Di Cloudflare **Workers & Pages**, buat Worker dari repository GitHub ini dan pilih branch production `master`.
2. Gunakan build settings berikut:

   ```text
   Build command:  pnpm build:cloudflare
   Deploy command: pnpm run deploy:cloudflare
   Root directory: /
   ```

   Tidak perlu mengisi output directory seperti Pages. Workers membaca entrypoint dan assets dari `wrangler.jsonc`. `.node-version` mengunci Node 24 untuk build.
3. `wrangler.jsonc` mendeklarasikan D1 binding `LEARNING_DB`. Wrangler 4.x dapat membuat dan menautkan resource D1 saat deployment pertama jika binding tersebut belum memiliki resource.
4. `pnpm run deploy:cloudflare` menjalankan `wrangler deploy`, lalu menerapkan semua migration yang belum dijalankan dari folder `migrations/` ke `LEARNING_DB`.
5. Untuk aplikasi pribadi, pasang Cloudflare Access sebelum membuka hostname production ke publik. Pemeriksaan Origin melindungi mutation dari cross-origin request, tetapi bukan autentikasi.

Untuk uji lokal runtime Cloudflare:

```sh
pnpm run preview:cloudflare
```

`pnpm dev`/`pnpm start` tetap memakai Node + `node:sqlite` lokal. Runtime Cloudflare memakai Astro Cloudflare adapter + D1; database lokal tidak dibawa ke Cloudflare.

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

`CS101_ORIGIN` hanya diperlukan sebagai override saat aplikasi berada di balik reverse proxy dengan origin eksplisit. Di Cloudflare Workers, mutation menerima origin request yang sama secara default sehingga `*.workers.dev` dan custom domain tidak perlu hard-code origin. Origin check bukan autentikasi; gunakan Cloudflare Access untuk aplikasi pribadi. Deployment Node tetap membutuhkan satu instance dengan disk persisten karena SQLite tidak cocok pada filesystem serverless sementara.

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
