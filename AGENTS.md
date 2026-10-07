# Agent workflow

Instruksi ini berlaku untuk seluruh repository. Ikuti permintaan user dan instruksi developer yang aktif; dokumen ini mengatur workflow repo, bukan menggantikan instruksi yang lebih tinggi.

## Sumber kebenaran

- Periksa implementasi, konfigurasi, migrasi, dan status Git sebelum menyimpulkan perilaku atau mengubah kode. Runtime dan kode aktif lebih kuat daripada dokumentasi lama.
- [`.agents/design.md`](.agents/design.md) memuat kontrak produk dan desain UI. [`.agents/engineering-design.md`](.agents/engineering-design.md) memuat target arsitektur. Keduanya berstatus draft; bedakan usulan dari perilaku yang sudah diterapkan.
- Pertahankan perubahan lokal yang sudah ada. Jangan menimpa atau membuang pekerjaan yang tidak dibuat untuk tugas ini.

## UI dan design system

UI default adalah **compact, flat, dan source-owned**. Sebelum membuat komponen UI baru, cari primitive yang sudah ada di `src/components/arc`. Jika use case-nya adalah primitive umum yang tersedia di UIArc, gunakan/port source UIArc ke `src/components/arc/<primitive>`; jangan membuat implementasi paralel di feature folder.

Boundary wajib:

```text
src/components/arc/      → primitive reusable, tanpa domain/product copy
src/components/ui/       → composition reusable milik CS-101
src/components/<feature> → composition domain/feature
src/components/pages/    → page composition
```

Aturan implementasi:

- Feature/page tidak boleh membuat native interactive control sendiri: tidak ada `<button>`, `<input>`, `<select>`, `<textarea>`, `<dialog>`, atau `<details>` di luar `src/components/arc`.
- Jangan import `@radix-ui/*` di luar `src/components/arc`. Radix adalah implementation detail primitive, bukan API feature.
- Jangan membuat tooltip, dialog/modal, select/dropdown, accordion/disclosure, radio group, input, textarea, alert, badge, empty state, atau theme control baru jika primitive Arc sudah ada.
- Icon memakai Lucide; jangan pakai glyph teks sebagai icon.
- Navigation tetap semantic: gunakan `<a href>` untuk perpindahan route. Jangan mengganti link menjadi Button hanya demi visual consistency.
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
