# CS-101

Learning execution workspace: Astro + MDX + React, TypeScript, SQLite (Node 24) untuk local, dan Cloudflare D1 untuk production.

## Jalankan

```sh
pnpm install --frozen-lockfile
pnpm dev
```


```sh
pnpm test
pnpm check
pnpm run build:node
pnpm start
```

`pnpm run build:node` membuat build Node lokal; `pnpm start` menjalankan hasil build tersebut pada host dan port yang sama. Jika port dev sedang dipakai, hentikan dev terlebih dahulu. `HOST` dan `PORT` dapat diatur untuk deployment private. Production membaca environment process; jika memakai `.env`, muat lewat service manager atau `node --env-file=.env scripts/start.mjs`.

## Deploy ke Cloudflare Workers lewat GitHub

Deployment mengikuti pola yang sama dengan `modu-app`: **Cloudflare Workers Builds melakukan build lebih dulu, lalu Wrangler hanya deploy artifact yang sudah selesai**.

```text
push master
  ↓
pnpm run build:cloudflare
  ├─ validate curriculum/content/review
  ├─ apply pending D1 migrations
  └─ Astro + @astrojs/cloudflare → dist/
  ↓
npx wrangler deploy
  ↓
Cloudflare Worker + D1
```

Gunakan konfigurasi dashboard berikut:

```text
Build command:  pnpm run build:cloudflare
Deploy command: npx wrangler deploy
Root directory: /
Production branch: master
```

Jangan tambahkan `build.command` ke `wrangler.jsonc`. Astro 7 memakai Vite dan build harus sudah selesai sebelum `wrangler deploy` dijalankan. `wrangler.jsonc` hanya menyimpan kontrak runtime: Worker entrypoint, assets, compatibility flag, observability, dan binding D1.

Untuk Astro 6+ / `@astrojs/cloudflare` v14, Worker entrypoint menggunakan `@astrojs/cloudflare/entrypoints/server`. Konfigurasi Cloudflare sekarang menjadi `astro.config.mjs` default, sama seperti project Astro Cloudflare yang dibuat oleh tooling resmi. Aplikasi ini tidak memakai Astro Sessions, jadi `session: false` dipakai dan tidak membutuhkan binding KV `SESSION`.

D1 tersedia sebagai binding `LEARNING_DB`. Setelah deployment pertama atau ketika ada migration baru, jalankan:

```sh
pnpm run migrate:cloudflare
```

Cloudflare menjalankan preparation release lewat `pnpm run build:cloudflare`: migration D1 yang belum terpasang lalu build yang tervalidasi. Deploy command tetap `npx wrangler deploy` dan hanya mengirim artifact yang sudah siap.

`pnpm run build` mendeteksi Cloudflare Workers Builds melalui `WORKERS_CI=1`. Di Workers Builds ia menjalankan migration D1 sebelum build; di local dan GitHub CI ia tetap pure build tanpa mutation remote. `pnpm run build:cloudflare` tersedia sebagai explicit release preparation.

Untuk deploy manual dari terminal:

```sh
pnpm run deploy:cloudflare
```

`pnpm run deploy:cloudflare` adalah release path manual: migrate D1 → validated Cloudflare build → `wrangler deploy`.

`astro.config.mjs` adalah konfigurasi production Cloudflare. `pnpm dev` dan `pnpm run build:node` memakai `astro.node.config.mjs` untuk runtime Node + `node:sqlite` lokal.

## Yang sudah tersedia

- Curriculum Manifest V2: Track → Module → Unit / Project Checkpoint / Integration dengan typed relation dan fingerprint deterministic.
- Curriculum Explorer untuk ratusan item, global search `Ctrl/⌘ K`, Today next-action, dan hierarchical Progress.
- Generic learning state untuk unit/project/integration: locked/ready, active/passed/stale, evidence session, revision conflict, dan retry-safe mutation.
- Cumulative project workflow dengan parent checkpoint, requirement delta, inherited guarantees, dan evidence.
- Cross-track integration workspace dan Connections: prerequisite, related, deep-dive, foundation, contributes-to.
- Review engine terpisah dari completion: scheduled/due/retry/retained dengan policy 1 → 3 → 7 → 14 → 30 hari.
- Graph-aware staged course generator: context packet → source pack → lesson spec → MDX + review bank → validation → promotion.
- SQLite local dan D1 production dengan contract parity test.
- CI Node 24: test, Astro check, safe Node build, dan runtime smoke.

Yang belum menjadi target selesai: auth multiuser, backup otomatis, dan lesson/review bank aktual untuk seluruh curriculum. Generator sudah siap, tetapi lesson tetap dihasilkan dan direview satu item pada satu waktu.

## Menambah curriculum dan lesson

Curriculum canonical berada di `curriculum/manifest.v2.json`. Item ID seperti `JAV-001`, `SQL-P01`, dan `INT-001` adalah identity stabil.

Untuk menghasilkan satu **unit**:

```sh
pnpm generation:prepare JAV-001
# research dan isi generation/staging/JAV-001/source-pack.json
# isi lesson-spec.json + lesson.mdx
pnpm generation:validate JAV-001
pnpm generation:promote JAV-001
```

Promotion menghasilkan:

```text
src/content/lessons/JAV-001.mdx
generation/JAV-001.json
review-banks/JAV-001.json
```

Checkpoint dan integration tidak digenerate sebagai lesson biasa; keduanya memakai workspace runtime masing-masing. Fingerprint dapat diperiksa dengan:

```sh
pnpm exec tsx scripts/fingerprint.ts JAV-001
```

Sebelum commit, jalankan `pnpm ci`. Generation tidak pernah mengubah learner completion state.

## Data dan API

Database default: `.data/learning.sqlite`, diabaikan Git. Atur `CS101_DB_PATH` ke path absolut pada disk persisten untuk production. Jangan menyimpan database di direktori `dist`. Ini aplikasi pribadi; autentikasi belum diimplementasikan.

| Route | Fungsi |
| --- | --- |
| `GET /api/learning` | Snapshot active item, progress, availability, review, revision |
| `POST /api/active-item` | Aktifkan item; opsional simpan draft item sebelumnya secara atomik |
| `POST /api/sessions` | Simpan session/evidence atau completion request |
| `POST /api/reviews` | Simpan review attempt dan advance/retry schedule |
| `GET /api/export` | Ekspor state, session, dan review history |

Mutasi memerlukan `Content-Type: application/json`, header `Origin` yang sama dengan server, UUID `requestId`, dan `revision` terakhir. Schema payload ada di `src/domain/learning/schema.ts`. Retry memakai ID dan payload yang sama. Conflict `409` memerlukan rekonsiliasi/reload; input tidak valid `422`. Snapshot kosong dimulai dari revision `0`.

`CS101_ORIGIN` hanya diperlukan sebagai override saat aplikasi berada di balik reverse proxy dengan origin eksplisit. Di Cloudflare Workers, mutation menerima origin request yang sama secara default sehingga `*.workers.dev` dan custom domain tidak perlu hard-code origin. Origin check bukan autentikasi; gunakan Cloudflare Access untuk aplikasi pribadi. Deployment Node tetap membutuhkan satu instance dengan disk persisten karena SQLite tidak cocok pada filesystem serverless sementara.

## Peta kode

```text
curriculum/              spesifikasi materi
generation/              sumber dan coverage lesson
migrations/              versi schema SQLite
src/content/lessons/     konten MDX
src/components/lesson/   konten interaktif MDX
src/components/learning/ form dan state belajar
src/layouts/             shell halaman
src/domain/              schema dan aturan domain
src/server/              service, database, HTTP boundary
src/pages/               halaman Astro dan API
tests/                   transaksi, retry, restart, curriculum, HTTP
```

Desain UI: [.agents/design.md](.agents/design.md). Arsitektur target: [.agents/engineering-design.md](.agents/engineering-design.md).
