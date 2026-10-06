# CS-101 — Product design

Draft · 6 Oktober 2026

Course pribadi untuk memahami konsep, mengerjakan challenge, dan menyimpan bukti belajar. Halaman pertama menjawab: **lanjut belajar dari mana?**

## Dasar keputusan

- Arahan Howlil yang terkonfirmasi dari percakapan: compact, clean, minimalis, tanpa verbosity dan AI slop.
- Profil preferensi Howlil terpisah belum tersedia. Palet, ukuran, dan layout di bawah adalah usulan.
- Kontrak produk berasal dari `course-generator`: satu task aktif, curriculum sebagai spesifikasi, lesson dibuat per task, kelulusan berdasarkan bukti.
- Skill `product design` belum ditemukan. Dokumen ini disusun langsung dari kontrak course dan sumber primer di bagian Riset.
- Repository belum berisi aplikasi atau curriculum. Task dan teks pada wireframe adalah contoh; belum menjadi materi resmi.

## Prinsip

1. **Materi langsung terlihat.** Judul, manfaat satu kalimat, lalu konsep pertama. Pembuka maksimal satu paragraf.
2. **Ringkas lewat struktur.** Satu gagasan per paragraf; penjelasan wajib tetap lengkap. Jangan menghapus exit criteria demi halaman pendek.
3. **Satu representasi utama.** Gunakan kode, tabel, atau diagram sesuai konsep. Hindari mengulang penjelasan yang sama dalam ketiganya.
4. **Satu aksi utama per konteks.** Lanjutkan, cek jawaban, atau simpan sesi. Aksi lain tampil sebagai link atau tombol sekunder.
5. **Status punya bukti.** Materi tersedia, task sedang dikerjakan, dan task lulus adalah status berbeda.
6. **Dekorasi dibatasi.** Tanpa gradient hero, kartu statistik kosong, emoji dekoratif, confetti, streak, atau slogan motivasi.

## Struktur produk

| Halaman | Isi utama | Aksi utama |
| --- | --- | --- |
| `/` · Hari ini | Task aktif, catatan terakhir, review jatuh tempo | Lanjutkan |
| `/learn/<TASK-ID>` · Materi | Konsep, contoh, latihan, challenge, bukti | Lanjut ke bagian terakhir; simpan sesi di akhir |
| `/review/<TASK-ID>` · Review | Lima soal recall, jawaban, perbaikan terarah | Periksa jawaban |
| `/progress` · Progres | Daftar task, status, riwayat sesi dan bukti | Buka task |

Navigasi utama: **Hari ini · Materi · Progres**. Materi menuju task aktif; jika belum ada, menuju daftar task pada Progres. Review masuk dari daftar jatuh tempo.

Sidebar mengelompokkan task berdasarkan track dan fase dari curriculum. Buka kelompok task aktif secara default. Urutan memakai field curriculum, bukan alfabet judul. Gunakan judul sebagai label dan Task ID sebagai metadata.

V1 memuat navigasi tersebut, lesson, latihan, pencatatan bukti, dan review. Pencarian seluruh isi ditambahkan ketika daftar materi sulit dipindai; filter Task ID/judul cukup untuk awal.

## Layout

Desktop ≥ 1200 px: sidebar 224 px, area baca maksimal 68ch, daftar isi 176 px; gap 32 px. Shell maksimal 1440 px, dipusatkan.

Tablet 768–1199 px: sidebar 200 px, area baca fleksibel, daftar isi menjadi disclosure di atas artikel. Mobile < 768 px: satu kolom, padding 20 px; menu materi berupa drawer. Di 320 px padding boleh turun ke 16 px.

Header 56 px. Sidebar dan daftar isi boleh sticky pada layar lebar. `scroll-margin-top` menjaga heading dan fokus tetap terlihat. Hindari sticky footer yang menutup isi pada mobile.

```text
CS-101                  Hari ini   Materi   Progres       Tema
────────────────────────────────────────────────────────────
DATABASE               SQL-001 · Fase 1            Di halaman ini
  Model relasional     Model relasional            Konsep
  Query dasar                                      Contoh
  Relasi tabel         Pahami hubungan baris,       Latihan
                       kolom, dan kunci.            Challenge
JAVA                                               Bukti
  …                    Lanjut dari: latihan 2
                       [Lanjutkan]

                       Konsep
                       Satu penjelasan inti.

                       Contoh → prediksi → hasil
                       [Cek jawaban]
```

```text
☰  CS-101                         Tema
──────────────────────────────────────
SQL-001 · Fase 1
Model relasional
Pahami hubungan baris, kolom, dan kunci.

Lanjut dari: latihan 2      [Lanjutkan]
Di halaman ini                       ▾

Konsep
Penjelasan → contoh → latihan
```

Halaman Hari ini memakai satu blok task aktif dan daftar review sederhana. Task baru dipilih dari curriculum; jangan mengisi halaman dengan data atau progres contoh yang terlihat nyata.

## Anatomi lesson

| Bagian | Tampilan dan perilaku |
| --- | --- |
| Judul | Task ID + fase kecil; H1; manfaat satu kalimat; prasyarat sebagai link |
| Target belajar | 3–7 hasil konkret, diturunkan dari exit criteria |
| Mental model | Satu pernyataan inti; diagram hanya jika relasinya membantu |
| Materi | Konsep dalam urutan dependensi, mekanisme dan contoh berdekatan |
| Latihan | Prediksi sebelum hasil; petunjuk dan jawaban dibuka terpisah |
| Kuis | Feedback setelah submit; jelaskan penyebab salah dan link bagian terkait |
| Challenge | Brief, acceptance criteria, bukti yang diminta; project bridge jika relevan |
| Bukti | Setiap exit criterion memiliki rujukan bukti; catatan lanjut dan simpan sesi |
| Sumber | Judul, penerbit, versi bila relevan, link langsung; daftar lengkap di akhir |

Seluruh slot wajib template MDX tetap tersedia. Pengelompokan visual dan heading boleh dirapikan tanpa melemahkan scope, challenge, atau coverage. Detail opsional dan solusi boleh dilipat; materi wajib dan acceptance criteria tetap terlihat.

Kode memakai label bahasa, tombol Salin, syntax highlighting tenang, dan scroll lokal jika diperlukan. Tabel lebar memiliki container sendiri. Diagram menyertakan teks yang menjelaskan relasi penting.

## Interaksi dan state

**Lanjut belajar.** Simpan Task ID, anchor bagian, dan catatan `continueFrom`. Lanjutkan membuka anchor terakhir; jika anchor berubah, buka awal task dan tampilkan catatan sebelumnya. Membuka lesson tidak otomatis membuat sesi atau meluluskan task.

**Simpan sesi.** Form berisi bukti, catatan lanjut, dan durasi opsional. Bukti wajib untuk mengajukan kelulusan; sesi progress cukup punya catatan lanjut atau bukti. Setelah berhasil tersimpan, tampilkan “Sesi tersimpan”. Kegagalan mempertahankan input dan menawarkan “Coba lagi”.

**Tandai lulus.** Validasi semua exit criteria, challenge, dan project requirement yang berlaku, lalu simpan bukti. V1 menggunakan penilaian mandiri yang diberi label jelas; checklist dan URL tidak membuktikan kebenaran teknis secara otomatis. Jika bukti belum lengkap, jelaskan bagian yang kurang. Membaca atau scrolling sampai akhir tidak mengubah status menjadi lulus.

**Review.** Lima soal recall sebelum catatan/solusi. Pilihan ganda bisa dinilai otomatis; jawaban terbuka menggunakan rubrik dan penilaian mandiri. Skor ≥ 4/5 = review lulus; sisanya tampilkan konsep untuk dipelajari ulang. Melihat jawaban sebelum penilaian menyelesaikan attempt sebagai latihan berbantuan, bukan review lulus. Jadwal interval berasal dari learning-state layer; jangan mengarang tanggal jika belum dikonfigurasi.

**Ganti task aktif.** Browsing task lain tetap diperbolehkan. “Jadikan task aktif” menyimpan draft sesi terlebih dahulu; perubahan batal jika penyimpanan gagal. Hanya satu task aktif.

| Kondisi | Respons UI |
| --- | --- |
| Curriculum kosong | “Curriculum belum tersedia.” Tanpa angka progres atau task buatan |
| Belum ada task aktif | Tampilkan urutan curriculum; aksi “Mulai task” |
| Materi belum dibuat | “Materi belum tersedia.” Task tetap terlihat; jangan tampilkan tombol generator yang belum berfungsi |
| Materi berubah/stale | “Materi perlu diperbarui.” Bukti lama tetap tersimpan bersama fingerprint asal; kelulusan baru memakai kriteria terkini |
| Tidak ada review | “Belum ada review terjadwal.” |
| Penyimpanan gagal | Input tetap ada, pesan dekat form, opsi coba lagi atau ekspor draft |
| Link task tidak ditemukan | Pesan singkat + kembali ke daftar materi |

## Visual tokens — usulan

Tampilan awal mengikuti tema perangkat, dengan pilihan Terang/Gelap/Sistem yang tersimpan. Warna aksen hanya untuk link, fokus, dan aksi utama.

| Token | Terang | Gelap |
| --- | --- | --- |
| Canvas | `#FAFAF9` | `#111110` |
| Surface | `#FFFFFF` | `#1C1C1A` |
| Teks | `#1C1C1A` | `#F5F5F4` |
| Teks sekunder | `#575752` | `#B7B7AD` |
| Divider dekoratif | `#E5E5E1` | `#343430` |
| Outline kontrol | `#73736B` | `#85857B` |
| Link/fokus | `#1D4ED8` | `#93C5FD` |
| Tombol utama | `#1D4ED8` + teks putih | `#93C5FD` + teks `#111110` |

- Font: system sans; monospace sistem untuk kode dan Task ID. Belum perlu font eksternal.
- Body: 16 px / 1.65. UI: 14 px / 1.4. Metadata: 13 px / 1.5. H1: 30 px / 1.2, mobile 26 px. H2: 22 px / 1.3.
- Spacing: 4, 8, 12, 16, 24, 32, 48 px. Antarbagian 32 px; antarparagraf 12–16 px.
- Radius 6 px, border 1 px. Shadow hanya pada elemen overlay.
- Kontrol utama tinggi minimal 40 px desktop, 44 px mobile. Ikon selalu punya accessible name.
- Status memakai label teks dan penanda sederhana. Warna saja tidak menyampaikan status.
- Gerak hanya feedback singkat, 120–160 ms. Hormati `prefers-reduced-motion`.

## Copy

Bahasa Indonesia langsung, istilah teknis tetap presisi. Suara lesson boleh memakai “lo” sesuai template; label UI cukup kata kerja. Judul menyebut topik; tombol menyebut hasil tindakan.

| Hindari | Pakai |
| --- | --- |
| Mulai perjalanan belajarmu | Mulai task |
| Unlock your potential | Lanjutkan |
| Selamat! Kamu luar biasa! | Jawaban benar. [Alasan singkat] |
| Terjadi kesalahan | Sesi belum tersimpan. Coba lagi. |
| Mari kita menyelami dunia SQL | Query mengambil baris yang memenuhi kondisi. |

Hapus pembuka generik, pujian otomatis, rekap yang mengulang isi, dan klaim tanpa sumber. Batas kata bukan ukuran kualitas; satu exit criterion harus tetap diajarkan dan diuji.

## Batas implementasi

Gunakan Astro + MDX sesuai skill. `LessonLayout` mengatur shell; lesson memasok konten. Komponen awal: `ContinueFrom`, `MentalModel`, `Reveal`, `Quiz`, `Challenge`, `ExitCriteria`, `SourceList`, `SessionLogger`, `ReviewMode`.

Curriculum menyimpan scope dan urutan. Generation metadata menyimpan sumber, fingerprint, dan coverage. Learning state menyimpan status; session log append-only menyimpan bukti. Jangan menyimpulkan status belajar dari keberadaan MDX.

Usulan V1: aplikasi pribadi dengan server Astro dan SQLite melalui storage adapter. Sesi, bukti, dan status disimpan dalam satu transaksi dengan request ID idempoten; JSON/JSONL tersedia sebagai ekspor. Browser menulis melalui endpoint tervalidasi. Rincian komponen, kontrak API, dan deployment ada di [engineering-design.md](engineering-design.md). Render statis hanya mendukung membaca sampai persistence adapter tersedia. Hosting publik dan akun multiuser memerlukan rancangan penyimpanan/auth terpisah.

## Riset dan penerapan

Sumber dibaca pada 6 Oktober 2026 melalui file resmi di GitHub karena domain situs dokumentasinya menolak akses environment. Observasi ini berdasarkan isi dokumentasi/source, bukan audit visual browser atau uji pengguna. Ukuran, palet, dan komposisi di atas adalah keputusan desain untuk brief ini.

| Sumber primer | Yang diamati | Penerapan |
| --- | --- | --- |
| [Astro tutorial](https://docs.astro.build/en/tutorial/0-introduction/) · [source yang dibaca](https://github.com/withastro/docs/blob/main/src/content/docs/en/tutorial/0-introduction/index.mdx) | Hasil proyek dan daftar kemampuan dikenalkan sebelum langkah tutorial | Payoff dan target belajar sebelum isi |
| [React Learn](https://react.dev/learn) · [source yang dibaca](https://github.com/reactjs/react.dev/blob/main/src/content/learn/index.md) | Tujuan belajar, contoh interaktif, diagram relasi, lalu arah praktik | Konsep dekat contoh; diagram menjelaskan mekanisme |
| [Starlight sidebar](https://starlight.astro.build/guides/sidebar/) · [source yang dibaca](https://github.com/withastro/starlight/blob/main/docs/src/content/docs/guides/sidebar.mdx) | Label dan kelompok navigasi dapat diatur eksplisit | Kelompok track/fase dan urutan curriculum |
| [WCAG target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) · [source yang dibaca](https://github.com/w3c/wcag/blob/main/understanding/22/target-size-minimum.html) | Minimum 24×24 CSS px atau memenuhi pengecualian ukuran/spacing | Kontrol produk dibuat 40–44 px; kepadatan tidak mengecilkan target |
| [WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) · [source yang dibaca](https://github.com/w3c/wcag/blob/main/understanding/21/reflow.html) | Isi umum harus reflow pada lebar setara 320 CSS px; konten dua dimensi punya pengecualian | Mobile satu kolom; overflow tabel/kode dilokalkan |
| [WCAG contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) · [source yang dibaca](https://github.com/w3c/wcag/blob/main/understanding/20/contrast-minimum.html) | Rasio 4.5:1 untuk teks normal; 3:1 untuk teks besar | Teks sekunder tetap terbaca pada kedua tema |

## Acceptance sebelum implementasi dinyatakan selesai

- [ ] Task aktif dan langkah lanjut terlihat tanpa melewati hero atau dashboard statistik.
- [ ] Semua exit criteria memiliki materi, assessment, dan tempat menyimpan bukti.
- [ ] Materi belum dibuat, kosong, stale, dan gagal simpan punya state nyata.
- [ ] Reload mengembalikan catatan tersimpan; retry tidak menggandakan session log.
- [ ] Membuka lesson atau reveal jawaban tidak otomatis meluluskan task/review.
- [ ] Keyboard dapat mengoperasikan menu, kuis, reveal, dan form; fokus terlihat dan kembali setelah drawer ditutup.
- [ ] Lebar 320, 768, dan 1440 px serta zoom 200%/400% tidak memotong isi atau kontrol penting.
- [ ] Kontras teks memenuhi 4.5:1, teks besar 3:1; outline kontrol dan indikator fokus memenuhi kebutuhan kontras nonteks.
- [ ] Pembaca layar memperoleh heading berurutan, label form, feedback jawaban, dan status penyimpanan.
- [ ] Setiap paragraf menambah informasi; tidak ada CTA ganda, klaim sumber palsu, atau angka progres contoh.

Status: kerangka UI dan demo lesson sudah diimplementasikan. Browser smoke check mencakup kuis, tema, layout 320–1440 px, serta alur simpan bukti dengan fixture terpisah. Checklist di atas tetap menjadi target lengkap; review engine dan curriculum asli belum tersedia. Lihat [README.md](../README.md) untuk status fitur.
