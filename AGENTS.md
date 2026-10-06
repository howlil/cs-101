# Agent workflow

Instruksi ini berlaku untuk seluruh repository. Ikuti permintaan user dan instruksi developer yang aktif; dokumen ini mengatur workflow repo, bukan menggantikan instruksi yang lebih tinggi.

## Sumber kebenaran

- Periksa implementasi, konfigurasi, migrasi, dan status Git sebelum menyimpulkan perilaku atau mengubah kode. Runtime dan kode aktif lebih kuat daripada dokumentasi lama.
- [`.agents/design.md`](.agents/design.md) memuat kontrak produk dan desain UI. [`.agents/engineering-design.md`](.agents/engineering-design.md) memuat target arsitektur. Keduanya berstatus draft; bedakan usulan dari perilaku yang sudah diterapkan.
- Pertahankan perubahan lokal yang sudah ada. Jangan menimpa atau membuang pekerjaan yang tidak dibuat untuk tugas ini.

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
