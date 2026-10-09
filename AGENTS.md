# Agent workflow

Instruksi ini berlaku untuk seluruh repository. Ikuti permintaan user dan instruksi developer yang aktif; dokumen ini mengatur workflow repo, bukan menggantikan instruksi yang lebih tinggi.

## Sumber kebenaran

- Periksa implementasi, konfigurasi, migrasi, dan status Git sebelum menyimpulkan perilaku atau mengubah kode. Runtime dan kode aktif lebih kuat daripada dokumentasi lama.
- [`.agents/design.md`](.agents/design.md) memuat kontrak produk dan desain UI. [`.agents/engineering-design.md`](.agents/engineering-design.md) memuat target arsitektur. Keduanya berstatus draft; bedakan usulan dari perilaku yang sudah diterapkan.
- Pertahankan perubahan lokal yang sudah ada. Jangan menimpa atau membuang pekerjaan yang tidak dibuat untuk tugas ini.

## Architecture boundaries — aturan wajib

**Acuan:** `AGENTS.md` adalah aturan perubahan; [`.agents/engineering-design.md`](.agents/engineering-design.md) adalah kontrak dependency; [`.agents/refactoring-plan.md`](.agents/refactoring-plan.md) adalah rencana migrasi yang **belum diterapkan**. Kode aktif tetap source of truth untuk path saat ini. Jangan mencampur target folder dengan klaim bahwa migrasi sudah selesai.

### Ownership dan arah dependency

`Astro route/layout → server/domain + page composition → feature UI → Arc primitives`.
Server mengimpor domain dan adapter storage, **tidak** komponen React. Domain hanya berisi model/rules/selectors/validasi dan tidak mengimpor `components/`, `pages/`, `server/` atau browser/React/Astro UI. React/MDX UI tidak boleh mengimpor `src/server/` atau mengakses database langsung.

| Boundary | Owner / batas |
| --- | --- |
| `src/pages/**`, `src/layouts/**` | Routing Astro, SSR loader, komposisi shell; API endpoints menghubungkan HTTP ke server use case. Route bukan tempat business rules. |
| `src/components/arc/**` | Primitive UIArc, Radix wrapper, source CSS; tidak boleh ada product copy/domain. Setiap primitive boleh memiliki folder sendiri karena CSS Modules/registry. |
| `src/components/app/**` | Global shell, sidebar, search, theme. Boleh mengomposisikan CurriculumExplorer tanpa menyalin logic curriculum. |
| `src/components/curriculum/**` | Explorer dan hubungan item yang digunakan beberapa halaman. |
| `src/components/lesson/**` (target) | Komponen presentasi MDX dan interactive quiz/reveal; bukan evidence persistence. |
| `src/components/learning/**` | ActivateItem, evidence, session, review attempt dan client mutation. Menggunakan API HTTP/domain types, bukan storage. |
| `src/components/pages/**` | Satu file komposisi per workspace. Boleh menggabungkan beberapa feature UI, tanpa domain mutations. |
| `src/components/ui/**` | Komponen product UI yang benar-benar dipakai lintas fitur. Bukan tempat menaruh file yang tidak tahu owner-nya. |
| `src/domain/**` | Pure schema, graph, selector, business rules, view-model; tidak bergantung pada UI maupun DB adapter. |
| `src/server/**` | Runtime, request snapshot, HTTP, SQLite dan D1. DB-specific transaction di adapter; behavior parity tetap shared. |
| `src/content/**`, `curriculum/`, `generation/`, `review-banks/`, `scripts/`, `migrations/` | Format/content/build-time artefacts dan tooling: tetap dipisah dari request runtime. |

### Keep it small: folder dan abstraksi

- **Tentukan owner berdasarkan alasan file berubah**, bukan ekstensi/jenis komponen. Prefer colocate dengan konsumen utama; pindah ke shared UI jika benar-benar dipakai lintas fitur.
- Jangan membuat direktori baru untuk satu komponen saja, kecuali Astro file-based route, primitive dengan CSS/registry, atau boundary domain dengan tanggung jawab stabil.
- Jangan menambah `features/`, `application/`, `ports/`, `adapters/`, `use-cases/`, `repositories/`, `services/`, `helpers/` atau `utils/` sebagai layer otomatis. Buat abstraction hanya jika menghilangkan duplikasi riil, menyederhanakan dependency, dan ada test yang membuktikannya.
- Hindari barrel `index.ts` untuk tiap folder; gunakan direct imports. Shared abstractions hanya jika ≥2 konsumen nyata **atau** ada boundary kontrak/testing yang dibuktikan dan lebih sederhana dari tanpa ekstraksi.
- Jangan mengubah domain behavior saat rename/move file; migration PR hanya mengubah path, imports, template/generator references, test path, dan bila perlu CSS import.
- Tidak boleh circular dependency, termasuk import `server/cloudflare-learning` terhadap `server/learning` semata-mata untuk mengambil tipe setelah kontrak bersama dipisah.
- V1 compatibility, endpoint alias, SQLite/D1, MDX, dan generator tetap berjalan sampai penggantinya diuji dengan parity/content/migration tests; **jangan menghapus karena folder terlihat tua**.

### Status migrasi (penting)

**Saat ini** `src/components/course/`, `search/`, `project/`, `ui/QuizClient.tsx` dan `ui/RevealAccordion.tsx` masih ada dan valid. **Target** adalah mengelompokkan komponen itu ke `lesson/`, `learning/`, dan `app/` setelah migrasi yang teruji. Saat menambah kode baru, gunakan target ownership; bila perlu edit komponen existing, jangan membuat duplikat target sebelum atomic move.

Sebelum refactor: inventaris seluruh import dan referensi string MDX/template/validator; pindahkan satu slice per PR; jalankan `pnpm validate`, `pnpm test`, `pnpm check`, `pnpm build:node`, Chrome browser smoke, serta generator validation yang relevan. Larang perubahan schema, API, completion, review, idempotency, atau deployment dalam UI relocation PR. Jika tidak lolos, jangan merge; rollback slice.


## UI dan design system

UI default adalah **compact, flat, dan source-owned**. Sebelum membuat komponen UI baru, cari primitive yang sudah ada di `src/components/arc`. Jika use case-nya adalah primitive umum yang tersedia di UIArc, gunakan/port source UIArc ke `src/components/arc/<primitive>`; jangan membuat implementasi paralel di feature folder.

Boundary UI wajib mengikuti tabel `Architecture boundaries` di atas: `arc/` hanya primitives, `app/curriculum/lesson/learning` untuk owner fitur, `pages/` untuk workspace composition, dan `ui/` hanya reusable product UI. Selama migrasi, path `course/search/project` lama masih sah; jangan membuat owner ganda.

Aturan implementasi:

- Feature/page tidak boleh membuat native interactive control sendiri: tidak ada `<button>`, `<input>`, `<select>`, `<textarea>`, `<dialog>`, atau `<details>` di luar `src/components/arc`.
- Jangan import `@radix-ui/*` di luar `src/components/arc`. Radix adalah implementation detail primitive, bukan API feature.
- Jangan membuat tooltip, dialog/modal, select/dropdown, accordion/disclosure, radio group, input, textarea, alert, badge, empty state, atau theme control baru jika primitive Arc sudah ada.
- Icon memakai Lucide; jangan pakai glyph teks sebagai icon.
- Navigation tetap semantic: gunakan `<a href>` untuk perpindahan route. Jangan mengganti link menjadi Button hanya demi visual consistency.
- `AppLayout.astro` owns ClientRouter navigation. Keep the Astro header persistent, but let the route workspace and route-aware rail swap; never persist a React wrapper around `<slot />`.
- SSR HTML includes private learner progress/revision and stays `Cache-Control: no-store`. Do not enable document prefetch or shared HTML caching until immutable curriculum content is separated from mutable learner state.
- Card/surface bukan default container. Gunakan Card hanya bila containment memang membawa makna; untuk content linear gunakan heading, spacing, divider, atau accent line.
- Density default adalah `data-density="compact"`. Gunakan token layout/control; jangan hard-code versi density baru per halaman.
- Jangan mengatasi ruang kosong desktop dengan melebarkan prose. Bedakan **page frame** dari **reading measure**: workbench desktop centered boleh sampai ±1500 px, sedangkan prose tetap ±72–76ch.
- Jangan membuat max-width page yang menempel kiri sehingga seluruh surplus width jatuh di sisi kanan. Semua non-curriculum workbench desktop harus centered.
- Jika ada secondary context, gunakan primary region elastis + context rail 300–320 px. Primary boleh melebar untuk rows, matrix, evidence, requirement, dan progress; paragraf tetap bounded.
- Jika tidak ada secondary context, primary boleh memakai page frame penuh untuk struktur non-prose (mis. Today next-step grid atau Progress modules), tetapi jangan membuat rail kosong/dekoratif.
- Route `/learn/*`, `/project/*`, dan `/integration/*` wajib memakai contextual curriculum explorer dari AppShell pada desktop. Jangan menghapus hierarchy ketika user membuka artifact; current item harus ter-highlight dan item links membuka artifact langsung.
- Scrollbar chrome boleh disembunyikan pada app panes/popup list yang tetap scrollable. Jangan menghilangkan scroll behavior atau membuat wheel/keyboard scrolling gagal.
- Icon-only navigation wajib punya accessible name dan Tooltip primitive Arc.
- Product composition seperti `ActionLink`, `EmptyAction`, atau wrapper domain tinggal di `src/components/ui`/feature folder, bukan di root `arc/`.
- Jika primitive Arc perlu dependency baru, gunakan pnpm dan commit `pnpm-lock.yaml`; jangan edit dependency tanpa lockfile yang sinkron.

### Bahasa learner-facing

Domain model boleh tetap presisi dengan istilah internal seperti `unit`, `checkpoint`, `integration`, `ready`, `retained`, `delta`, `inherited`, dan relation type. **Jangan bocorkan istilah internal itu ke UI jika bahasa yang lebih langsung tersedia.**

Gunakan vocabulary learner-facing berikut:

| Internal | UI |
| --- | --- |
| unit | Materi |
| checkpoint | Project |
| integration | Latihan gabungan |
| ready | Bisa dimulai |
| active | Sedang dikerjakan |
| passed | Selesai |
| stale | Perlu diperbarui |
| scope | Yang perlu dikuasai |
| challenge | Latihan |
| criteria / Definition of Done | Selesai jika |
| requirement | Yang harus dipenuhi |
| evidence | Bukti |
| readiness | Prasyarat |
| retention | Jadwal review |
| delta | Yang baru |
| inherited guarantee | Dari project sebelumnya / Yang harus tetap benar |
| artifact | Hasil yang dibuat |
| deep_dive | Pendalaman |
| contributes_to | Dipakai di project |

- Jangan membuat glossary sebagai solusi utama. Copy utama harus bisa dipahami tanpa menghafal ontology CS-101.
- Metadata/policy sekunder seperti interval review 1/3/7/14/30 memakai progressive disclosure.
- Generated lesson bukan syarat kelulusan. Jika lesson belum tersedia, route belajar wajib tetap executable dari scope, latihan, kriteria selesai, sumber, session, dan bukti curriculum.
- Session default harus ringan: titik lanjut adalah input utama; durasi, hambatan, dan refleksi bersifat opsional/progressive disclosure.
- Jangan menghidupkan weekly planner, planned-hours dashboard, streak, atau antrean spreadsheet sebagai product surface tanpa user problem baru yang konkret.

Sebelum menambah primitive baru:

```text
need
↓
cek src/components/arc
↓ tidak ada
cek registry/docs UIArc
↓ tersedia
port/install source → arc/
↓ tidak tersedia
buat primitive minimal di arc/ + dokumentasikan alasan
```

Gate UI wajib sebelum integrasi:

```text
pnpm validate:ui
pnpm check
pnpm test
pnpm build:node
```

## Pilih workflow sesuai risiko

Mulai dengan memahami kebutuhan dan mengklasifikasikan perubahan:

```text
format / rename / wiring kecil  → perubahan langsung + pemeriksaan terkait
aturan atau bug lokal           → bukti perilaku terarah + perubahan minimal
API / persistence / state        → kontrak dan ownership + uji di boundary terkait
migrasi / concurrency / auth     → invariant eksplisit + bukti faithful + review lebih dalam
```

Gunakan skill sebagai alat untuk keputusan yang belum jelas, bukan tahapan wajib:

- `$product-design` untuk masalah, perilaku, atau batas MVP yang belum jelas.
- `$engineering-design` untuk ownership, source of truth, batas modul, kontrak, persistence, dan konsistensi.
- `$design-thinking` untuk memodelkan bentuk data, alur sukses, kegagalan, dependency, dan state saat implementasi tidak sepele.
- `$design-graph` untuk layar, form, navigasi, state UI async, layout interaktif, atau aksesibilitas.
- `$test-engineering` untuk pembuktian yang sulit seperti transaksi, race, migrasi, retry, atau recovery.
- `$code-review` untuk review independen atas perubahan non-trivial; `$security-review` untuk perubahan pada auth, akses, data sensitif, input tidak tepercaya, file, atau jaringan.
- `$graph-protocol` sebelum delegasi atau perubahan medium/besar yang membutuhkan beberapa jalur kerja. Delegasikan hanya jika paralelisme, keahlian khusus, atau review independen sepadan dengan koordinasinya.

Untuk pekerjaan teknis non-sepele, nyatakan graph yang relevan: bentuk data/state, alur sukses (`A`), kegagalan (`E`), dan kapabilitas/kebutuhan konteks (`R`). Untuk perubahan UI, petakan surface, konten (`C`), void state (`V`), dan kebutuhan (`N`). Gunakan `$call-graph-output` hanya saat execution path yang sudah dipahami lebih mudah dibaca sebagai graph.

## Implementasi dan bukti

Kerjakan satu hasil yang koheren dalam siklus singkat:

```text
inspeksi → klasifikasi → satu slice → bukti perilaku → review diff → integrasi
```

- Pertahankan ownership modul dan source of truth. Pilih solusi terkecil yang menjaga invariant; jangan menambah abstraksi, dependency, atau cleanup yang tidak punya alasan konkret.
- Untuk perilaku deterministik, utamakan regression test yang membuktikan perilaku pada boundary terkecil yang faithful. Gunakan database atau infrastruktur nyata jika semantiknya memang bagian dari risiko.
- Jalankan pemeriksaan paling relevan terhadap perubahan; sebelum integrasi jalankan gate repo yang berlaku seperti test, typecheck, lint, atau build. Jangan mengklaim pemeriksaan yang tidak dijalankan.
- Jangan memperluas perubahan ke refactor, dependency upgrade, dokumentasi, atau cleanup yang tidak diperlukan. Dokumentasikan keputusan hanya jika keputusan jangka panjang berubah.
- Package manager repo adalah pnpm. Gunakan `pnpm` dan `pnpm-lock.yaml`; jangan membuat ulang `package-lock.json`.

## Git dan penyelesaian

- Jaga `main` tetap releasable. Gunakan satu branch pendek untuk perubahan non-trivial bila diperlukan; hindari branch jangka panjang.
- Commit, push, merge, deploy, atau perubahan eksternal lain memerlukan permintaan atau otorisasi eksplisit user.
- Sebelum menyatakan selesai, bandingkan hasil dengan permintaan, periksa diff aktual dan perubahan tak terkait, lalu laporkan ringkas apa yang berubah serta bukti pemeriksaannya. Sebutkan batas verifikasi dengan jujur.
