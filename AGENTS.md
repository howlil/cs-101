# Agent workflow

Instruksi ini berlaku untuk seluruh repository. Ikuti permintaan user dan instruksi developer yang aktif; dokumen ini mengatur workflow repo, bukan menggantikan instruksi yang lebih tinggi.

## Sumber kebenaran

- Periksa implementasi, konfigurasi, migrasi, dan status Git sebelum menyimpulkan perilaku atau mengubah kode. Runtime dan kode aktif lebih kuat daripada dokumentasi lama.
- [`.agents/design.md`](.agents/design.md) memuat kontrak produk dan desain UI. [`.agents/engineering-design.md`](.agents/engineering-design.md) memuat target arsitektur. Keduanya berstatus draft; bedakan usulan dari perilaku yang sudah diterapkan.
- Pertahankan perubahan lokal yang sudah ada. Jangan menimpa atau membuang pekerjaan yang tidak dibuat untuk tugas ini.

## Architecture boundaries — wajib untuk setiap feature

Lihat [`.agents/architecture.md`](.agents/architecture.md) sebagai kontrak **aktif** untuk ownership, arah dependency, dan aturan penempatan file. Untuk perubahan nontrivial, petakan `source → domain decision → persistence → API/SSR → UI` sebelum implementasi.

- **Satu owner untuk business rule.** `src/domain/` memiliki schema, curriculum graph, learning decisions, dan review policy; domain tidak boleh import server, komponen UI, Astro, atau database.
- **Storage bukan owner policy.** `src/server/learning/sqlite.ts` dan `src/server/learning/d1.ts` menjalankan transaksi masing-masing; keduanya wajib memakai fungsi bersama dari `src/domain/learning/decisions.ts`. Shared snapshot type ada di `src/server/learning/contract.ts`.
- **Transport tetap tipis.** `src/pages/api/` hanya menangani HTTP; `src/pages/**/*.astro` melakukan SSR composition dengan props serializable, bukan logika completion/SQL.
- **UI tidak mengakses storage langsung.** `src/components/arc/` hanya generic UI primitives; product composition tinggal di `components/ui/` atau feature folder. Jangan membuat struktur `features/` paralel.
- **Tidak over-layer.** Hindari per-table repository, use-case/controller/presenter generik, dan abstraction satu konsumen. Ekstrak fungsi kecil jika ada owner jelas atau duplikasi nyata.
- **Compatibility V1 hanya sementara.** Jangan menambah penggunaan `taskId`, `task_progress`, atau `active-task`. Hapus hanya setelah data historis, endpoint, export, dan migration tervalidasi.
- **Enforcement:** jalankan `pnpm validate:architecture`, `pnpm validate:ui`, `pnpm test`, `pnpm check`, dan `pnpm build:node`. Untuk SQLite/D1 state mutation, uji parity, conflict, retry, dan transactional invariants. Mock D1 bukan substitusi test race pada D1 asli.


### UI ownership: current and planned (no moves yet)

Ownership migration is complete: Astro lesson blocks, quiz and reveal are under `lesson`; evidence/review/activation under `learning`; search/theme under `app`, project guarantee disclosure colocated with its page. Do not create duplicate components in target folders early.

**Future ownership** after the staged refactor:

| Owner | Scope |
| --- | --- |
| `components/arc/` | Source-owned generic UIArc primitives + CSS Modules; intentionally one subfolder per primitive |
| `components/app/` | AppShell, AppSidebar, NavigationProgress, global search and theme preference |
| `components/curriculum/` | CurriculumExplorer and shared connections |
| `components/lesson/` | Astro MDX blocks, LessonStage, QuizClient, RevealAccordion; not session persistence |
| `components/learning/` | Activation, EvidenceForm, SessionLogger, ProjectEvidence, IntegrationEvidence, ReviewAttempt, API client |
| `components/pages/` | Flat route workspace compositions; React page components orchestrate feature UI |
| `components/ui/` | Truly reusable product UI such as ActionLink/EmptyAction; never a catch-all |

Keep `src/pages/`, `src/layouts/`, `src/content/`, `src/domain/`, `src/server/`, `src/styles/`, generated artifacts, tests and UIArc layout intact during the UI move.

**Selection rule:** put a new component with its primary consumer unless several real consumers or a stable independently tested boundary justify sharing. No automatic `features/`, `application/`, `hooks/`, `helpers/`, `ports/`, `repositories/` or per-feature `index.ts`. One-file folders are acceptable only for Astro routes, primitive+CSS/registry, or a real stable owner. Domain/server/React UI dependency restrictions in `architecture.md` remain authoritative.

**No-behavior-change migrations:** one ownership slice per PR; update imports, MDX, generator templates, source references, CSS-module paths and tests atomically. Do not mix with design changes, DB migrations, dependency upgrades or API modifications. Existing `pnpm validate:architecture` remains mandatory; enhance it to forbid retired folders only **after** those folders have been migrated. Detailed move map, risk and rollback: [`.agents/refactoring-plan.md`](.agents/refactoring-plan.md).


## UI dan design system

UI default adalah **compact, flat, dan source-owned**. Sebelum membuat komponen UI baru, cari primitive yang sudah ada di `src/components/arc`. Jika use case-nya adalah primitive umum yang tersedia di UIArc, gunakan/port source UIArc ke `src/components/arc/<primitive>`; jangan membuat implementasi paralel di feature folder.

Boundary UI wajib: `arc/` generic primitives; `pages/` route composition; `ui/` product-reusable; `app/curriculum/learning` feature owners. `lesson/` sudah aktif; `course/project` masih path aktif sampai komponen sisanya dipindahkan. Ikuti tabel di `UI ownership` di atas; jangan menciptakan owner ganda.

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
