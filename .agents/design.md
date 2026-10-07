# CS-101 — Product design

Updated · 7 Oktober 2026

CS-101 adalah **learning execution workspace** untuk curriculum engineering yang besar dan saling terhubung. Produk bukan sekadar course reader atau daftar lesson. Tugas utamanya adalah menjawab tiga pertanyaan:

1. **Apa yang harus dikerjakan sekarang?**
2. **Materi ini berada di mana dan bergantung pada apa?**
3. **Apa bukti bahwa materi atau project benar-benar selesai?**

Curriculum sumber saat ini berisi 163 unit materi, 40 project checkpoint, dan 3 latihan integrasi lintas jalur. Karena itu desain harus tetap compact ketika curriculum bertambah, tanpa mengubah semua item menjadi flat sidebar atau graph visual yang sulit dibaca.

## Product thesis

Gunakan tiga model yang berbeda untuk tiga kebutuhan berbeda:

```text
Hierarchy  → menemukan materi
Graph      → dependency dan hubungan lintas materi
State      → menentukan pekerjaan berikutnya
```

Hierarchy adalah representasi utama di UI. Graph adalah model domain di belakang layar dan hanya divisualisasikan ketika hubungan memang perlu dijelaskan. State menentukan ready/active/passed/review tanpa mengubah hierarchy.

Produk mengikuti loop:

```text
Orientasi
  ↓
Pilih / lanjutkan item
  ↓
Pahami konsep
  ↓
Kerjakan challenge / project
  ↓
Simpan evidence
  ↓
Lulus
  ↓
Review
  ↓
Item berikutnya menjadi ready
```

## Vocabulary produk

Gunakan istilah berikut secara konsisten di UI, domain, dan dokumentasi.

| Entitas | Contoh | Makna |
| --- | --- | --- |
| Track | Java, DB & SQL, Networking | Bidang besar |
| Module | Java Core, Testing, Network Foundations | Kelompok kompetensi di dalam track |
| Unit | Collections + Generics | Satu unit belajar |
| Scope | List, Set, Map, generics | Materi yang harus dipahami |
| Challenge | One-pass Settlement Index | Mini-case di dalam unit |
| Criterion | Top-K benar, complexity benar | Definition of Done unit |
| Checkpoint | Adversarial Ledger Kernel | Project kumulatif setelah sekumpulan unit |
| Integration | Cross-track exercise | Latihan yang membutuhkan beberapa track |
| Relation | prerequisite, related, deep dive | Hubungan antar-item |
| Evidence | test, repo, output, note, URL | Bukti terhadap criterion/requirement |

Istilah `task` boleh tetap muncul sementara pada kompatibilitas implementasi lama, tetapi model produk baru memakai **item** sebagai istilah generik untuk unit, checkpoint, dan integration.

## Struktur curriculum

Curriculum bukan silo per track.

```text
Track
  └─ Module
      ├─ Unit
      ├─ Unit
      ├─ Unit
      └─ Checkpoint

Track A Unit ─────┐
Track B Unit ─────┼─→ Integration
Track C Unit ─────┘

Unit ─ related/deep-dive ─→ Unit di track lain
Checkpoint 1 ─ parent ─→ Checkpoint 2 ─→ Checkpoint 3
```

Urutan visual tetap memakai hierarchy Track → Module → Item. Dependency dan cross-module relation tidak mengubah urutan navigasi.

### Cumulative project

Checkpoint adalah project yang berkembang, bukan project baru dari nol.

```text
P1
 ↓
P2 = P1 guarantees + requirement baru
 ↓
P3 = P2 guarantees + requirement baru
 ↓
...
```

UI project harus membedakan:

- **New in this checkpoint**
- **Inherited guarantees**
- prerequisite yang membuka checkpoint
- evidence untuk requirement aktif
- checkpoint sebelum dan sesudahnya

Jangan menampilkan semua requirement warisan berulang kali dalam satu blok panjang. Requirement asli tetap disimpan utuh, tetapi UI boleh melakukan progressive disclosure.

## Prinsip desain

1. **Next action lebih penting daripada dashboard.** Halaman pertama menunjukkan satu item aktif atau satu item berikutnya yang ready.
2. **Hierarchy untuk navigasi, graph untuk penjelasan.** Jangan jadikan dependency graph sebagai navigasi utama.
3. **Progressive disclosure.** Jangan expand 200+ item sekaligus. Buka track dan module yang sedang relevan.
4. **Satu aksi utama per konteks.** Continue, mulai item, simpan sesi, atau submit evidence.
5. **Status tidak disimpulkan dari waktu atau scroll.** Completion berasal dari evidence terhadap Definition of Done.
6. **Project adalah first-class entity.** Project tidak dirender seperti lesson panjang biasa.
7. **Cross-track relation terlihat saat dibutuhkan.** Tampilkan Requires, Used later by, Related, dan Deep dive di context section.
8. **Compact bukan berarti kecil.** Kurangi chrome dan whitespace berlebih, bukan target klik atau readability.
9. **Tidak ada gamification palsu.** Hindari streak, XP, badge dekoratif, confetti, progress angka yang tidak membantu keputusan.
10. **Sumber curriculum tidak dikaburkan oleh lesson.** Lesson menjelaskan curriculum; lesson tidak boleh mengubah scope/criteria.

## Information architecture

Navigasi global hanya tiga tujuan:

| Route | Label | Job |
| --- | --- | --- |
| `/` | Hari ini | Apa yang perlu dikerjakan sekarang |
| `/curriculum` | Materi | Browse hierarchy curriculum |
| `/progress` | Progres | Melihat state keseluruhan |

Route item:

| Route | Isi |
| --- | --- |
| `/learn/<ITEM-ID>` | Unit lesson |
| `/project/<ITEM-ID>` | Project checkpoint |
| `/integration/<ITEM-ID>` | Cross-track integration |
| `/review/<ITEM-ID>` | Recall/review |

**Materi tidak lagi berarti active lesson.** Active lesson dibuka dari Hari ini melalui Continue. Materi berarti curriculum explorer.

Review dan Project tidak perlu menjadi global navigation. Keduanya masuk dari workflow yang relevan.

## App shell

Desktop memakai tiga layer:

```text
┌─────────────────────────────────────────────────────────────────┐
│ CS-101                                      Star  Donate  Theme │
├────┬───────────────────────┬────────────────────────────────────┤
│ 🏠 │ Contextual explorer   │ Main workspace                     │
│ 📚 │                       │                                    │
│ 📈 │                       │                                    │
└────┴───────────────────────┴────────────────────────────────────┘
 60px        ~240px
```

### Global rail

- Lebar sekitar 56–64 px.
- Icon-only untuk Hari ini, Materi, Progres.
- Tooltip dan accessible name wajib.
- Active state jelas.
- Tidak menaruh daftar materi di rail.
- Utility seperti settings hanya jika benar-benar ada fungsi.

### Contextual explorer

Panel kedua hanya muncul saat konteks membutuhkan hierarchy, terutama `/curriculum`, `/learn/*`, `/project/*`, dan `/integration/*`.

Explorer menunjukkan **satu track aktif** secara penuh. Track lain dipilih dari track switcher; jangan expand semua track sekaligus.

Contoh:

```text
Java                                      2/21

Java Core                                 2/5
  ✓ JAV-001
  ● JAV-002
  ○ JAV-003
  ○ JAV-004
  ○ JAV-005
  ◆ Project 1

Java Design                               0/1
Testing                                   0/3
Runtime                                   0/3
...
```

Item row cukup berisi status marker, ID, dan judul pendek. Metadata detail tetap di workspace.

### Main workspace

- Lebar baca lesson maksimal sekitar 68–72ch.
- Project workspace boleh lebih lebar karena requirement/evidence matrix.
- Header halaman compact: breadcrumb, ID, title, satu subtitle.
- Tidak ada hero marketing.
- Tidak ada stat cards generic di Hari ini.

### Responsive

- Desktop ≥1200 px: rail + explorer + workspace.
- Tablet 768–1199 px: rail tetap; explorer menjadi drawer atau collapsible panel.
- Mobile <768 px: top bar + drawer curriculum; content satu kolom.
- 320 px dan zoom 200–400% tetap usable.
- Target kontrol minimal mengikuti WCAG; compactness berasal dari pengurangan chrome, bukan target kecil.

## Halaman Hari ini

Hari ini menjawab **apa next action sekarang**, bukan menampilkan analytics.

Jika ada active item:

```text
Hari ini

SQL-001
Relational model + PostgreSQL fundamentals

DB & SQL / SQL Core
Lanjut dari: NULL semantics

[Continue]

Project context
SQL Project 1 · 2 unit lagi sebelum checkpoint

Review
JAV-001 · jatuh tempo
[Review]
```

Jika tidak ada active item:

```text
Tidak ada item aktif.

Next ready
JAV-002 · OOP + object contracts
[Mulai]
```

Jangan menampilkan kartu `0 task`, `0 review`, `0 selesai` jika angka tersebut tidak mengubah keputusan user.

## Curriculum explorer

Curriculum explorer harus mendukung curriculum ratusan item tanpa berubah menjadi tree tanpa batas.

### Track switcher

Tampilkan daftar ringkas:

```text
Java                    2/21
DB & SQL                0/20
Networking              0/27
OS & Linux              0/23
Distributed Systems     0/23
Software Design         0/24
Production Engineering  0/25
```

Jumlah completion adalah secondary metadata, bukan visual utama.

### Module

Module adalah grouping navigasi utama di dalam track. Hanya module aktif dibuka otomatis. Module lain collapsed dengan ringkasan completion.

Identitas module harus stabil dan terpisah dari label source. Nomor phase dari spreadsheet tidak boleh dianggap identifier unik.

### Search

Dengan 163 unit + 40 checkpoint + integration, search sudah menjadi kebutuhan inti.

`Cmd/Ctrl + K` mencari:

- ID
- title
- track
- module
- keyword dari scope

Tidak perlu external search service. Search lokal dari manifest cukup.

## Unit page

Unit tetap menggunakan lesson MDX, tetapi anatomy wajib mengikuti curriculum.

```text
Breadcrumb / ID
Title
Why this matters

Mental model
Concept
Mechanism
Example
Practice

Mini challenge

Definition of Done
Evidence

Connections
Sources
```

| Bagian | Aturan |
| --- | --- |
| Header | ID, module, title, prerequisite penting |
| Target belajar | Turunan exit criteria; konkret |
| Mental model | Satu model inti; diagram hanya jika relasi membantu |
| Materi | Konsep → mekanisme → contoh, dalam urutan dependency |
| Practice | Prediksi sebelum hasil; feedback dekat dengan latihan |
| Challenge | Brief asli dipertahankan; acceptance tidak dipangkas |
| Definition of Done | Criteria terlihat sebagai target evidence, bukan decorative checklist |
| Evidence | Evidence dapat mendukung satu atau beberapa criteria secara eksplisit |
| Connections | Requires, Used later by, Related, Deep dive |
| Sources | Sumber asli + versi jika ada |

Membuka lesson, scroll ke bawah, atau menghabiskan waktu tidak pernah otomatis meluluskan unit.

## Project checkpoint page

Project bukan lesson.

Contoh struktur:

```text
◆ Project 2
Rule Explosion Gauntlet

Built on
Project 1 · Adversarial Ledger Kernel

New in this checkpoint
+ requirement baru
+ requirement baru
+ requirement baru

Inherited guarantees
12 requirement dari Project 1
[Show inherited]

Evidence
□ repository
□ tests
□ benchmark / report
...
```

Project workspace harus membantu user melihat delta terhadap checkpoint sebelumnya. Jangan menulis ulang seluruh project history sebagai satu halaman panjang.

Status project hanya `passed` jika semua requirement aktif memiliki evidence yang valid menurut aturan produk.

## Integration page

Integration adalah item lintas track.

```text
INT-001 · Bootstrap Integration

Requires
Java foundation     ✓
SQL foundation      ✓
Linux foundation    ○

Locked
LIN-001 belum lulus
```

Begitu seluruh hard prerequisite passed, state berubah menjadi Ready secara otomatis.

Integration mempunyai brief, criteria, dan evidence sendiri; bukan child dari satu track tertentu.

## Connections

Cross-module reference penting, tetapi jangan diubah menjadi hard prerequisite secara otomatis.

Tipe relation:

| Relation | Memblokir availability |
| --- | --- |
| prerequisite | Ya |
| foundation | Tidak secara default |
| related | Tidak |
| deep_dive | Tidak |
| contributes_to | Tidak |
| project_parent | Menentukan lineage, bukan learning lock umum |

Default UI menampilkan relation sebagai compact list. Graph visualization bersifat secondary view, bukan navigation default.

## Progress

Progress menjawab: **secara keseluruhan gue ada di mana?**

Default view hierarchical:

```text
Java
  Java Core        2/5
  ◆ Project 1      Ready
  Testing          0/3

DB & SQL
  SQL Core         1/4
  ◆ Project 1      Locked
```

Progress tidak dihitung dari menit. Minutes adalah telemetry.

Satu item memiliki tiga axis state yang terpisah:

| Axis | Nilai contoh |
| --- | --- |
| Availability | locked, ready |
| Completion | not_started, active, passed, stale |
| Review | none, scheduled, due, retry, retained |

Contoh:

```text
JAV-001
availability = ready
completion   = passed
review       = due
```

Jangan membuat satu enum besar yang mencampur ketiganya.

Mode `Connections` boleh ditambahkan di Progress untuk melihat dependency/cross-track graph, tetapi Overview hierarchical tetap default.

## Evidence dan completion

Aturan produk:

```text
READING ≠ COMPLETE
TIME ≠ COMPLETE
SCROLL ≠ COMPLETE

Evidence
  +
Challenge
  +
Exit criteria
  =
Passed
```

Untuk checkpoint:

```text
all active project requirements evidenced
→ Passed
```

Untuk integration:

```text
all integration criteria evidenced
→ Passed
```

Evidence dan session adalah konsep berbeda:

- **Session**: apa yang dikerjakan, kapan, titik lanjut, durasi opsional.
- **Evidence**: artefak/hasil yang membuktikan criterion atau requirement.

Satu evidence boleh mendukung beberapa criteria.

## Review

Review menguji recall setelah completion, bukan menggantikan evidence.

- Lima soal per attempt sebagai default saat ini.
- Skor ≥4/5 dapat lulus jika attempt tidak dibantu.
- Reveal sebelum submit memberi `assisted=true`.
- Review failure tidak membatalkan historical evidence/completion.
- Schedule berasal dari learning-state layer; jangan mengarang tanggal.

Review due/retry muncul di Hari ini dan Progress; tidak perlu global navigation sendiri.

Policy runtime v1 memakai interval 1, 3, 7, 14, dan 30 hari setelah keberhasilan sebelumnya. Ini adalah keputusan produk aplikasi, bukan data curriculum workbook. Setelah interval terakhir berhasil, review menjadi `retained`. Review gagal tidak membatalkan completion; state menjadi `retry`.

Answer key review tidak dikirim ke client sebelum submit. Server melakukan grading; remediation/explanation baru dikirim setelah attempt tercatat.

## Interaksi utama

**Continue.** Menyimpan `activeItemId`, anchor, dan `continueFrom`. Jika anchor sudah tidak ada setelah content berubah, buka awal item dan tetap tampilkan catatan terakhir.

**Ganti active item.** Browsing item lain tetap boleh. Menjadikan item baru aktif harus menyimpan draft session sebelumnya terlebih dahulu. Hanya satu active item.

**Simpan session.** Input dipertahankan saat gagal. Success hanya setelah commit storage.

**Submit evidence.** Evidence dipetakan eksplisit ke criterion/requirement. URL atau checklist tidak otomatis membuktikan correctness.

**Curriculum stale.** Historical evidence tetap ada dengan fingerprint asal. Completion baru mengikuti curriculum aktif.

## Empty dan error state

| Kondisi | Respons UI |
| --- | --- |
| Curriculum kosong | “Curriculum belum tersedia.” |
| Tidak ada active item | Tampilkan next ready item |
| Item locked | Tampilkan prerequisite yang belum passed |
| Lesson belum tersedia | Item tetap terlihat; “Materi belum tersedia.” |
| Curriculum stale | “Materi perlu diperbarui.” Evidence historis tetap terlihat |
| Tidak ada review | Jangan buat section besar kosong |
| Save gagal | Pertahankan input + “Coba lagi” |
| Item ID tidak ditemukan | Pesan singkat + kembali ke curriculum |
| Relation unresolved | Jangan crash UI; tandai sebagai validation issue saat build |

## Visual direction

Tampilan tetap minimal dan utilitarian.

| Token | Terang | Gelap |
| --- | --- | --- |
| Canvas | `#FAFAF9` | `#111110` |
| Surface | `#FFFFFF` | `#1C1C1A` |
| Teks | `#1C1C1A` | `#F5F5F4` |
| Teks sekunder | `#575752` | `#B7B7AD` |
| Divider | `#E5E5E1` | `#343430` |
| Outline | `#73736B` | `#85857B` |
| Accent | `#1D4ED8` | `#93C5FD` |

- System sans; monospace untuk ID/kode.
- Body lesson 16px/1.65; UI 13–14px.
- Spacing utama 4, 8, 12, 16, 24, 32.
- Radius 6–10px; shadow hanya overlay.
- Utility Star/Donate secondary; tidak boleh mengalahkan learning action.
- Empty state compact, horizontal bila ruang cukup.
- Status selalu punya label/shape; warna saja tidak cukup.
- Motion 120–160ms dan hormati `prefers-reduced-motion`.

## Copy

Bahasa Indonesia langsung. Istilah teknis tetap presisi.

| Hindari | Pakai |
| --- | --- |
| Mulai perjalanan belajarmu | Mulai unit |
| Unlock your potential | Continue |
| Selamat! Kamu luar biasa! | Jawaban benar. [alasan] |
| Terjadi kesalahan | Sesi belum tersimpan. Coba lagi. |
| Progress 73% karena waktu | 3 dari 5 criteria terbukti |

Hindari pembuka generik, motivasi otomatis, angka vanity, dan rekap yang tidak menambah keputusan.

## Batas implementasi produk

Astro + MDX tetap cocok untuk lesson. Curriculum hierarchy dan graph berasal dari manifest yang tervalidasi, bukan dari struktur folder MDX. Learning state berasal dari storage runtime, bukan dari keberadaan content file.

Artifact berbeda berdasarkan item:

| Item | Artifact utama |
| --- | --- |
| Unit | Lesson MDX |
| Checkpoint | Project workspace/brief |
| Integration | Integration workspace/brief |
| Review | Assessment attempt |

Graph tidak membutuhkan graph database atau visualisasi selalu aktif. Data curriculum cukup kecil untuk di-index sebagai struktur in-memory saat build/runtime.

## Acceptance product

- [ ] Hari ini menunjukkan satu next action tanpa hero atau dashboard statistik.
- [ ] Global navigation hanya Hari ini, Materi, Progres.
- [ ] Curriculum explorer dapat menavigasi track → module → item tanpa expand seluruh curriculum.
- [ ] Unit, checkpoint, dan integration punya presentation berbeda.
- [ ] Cumulative project membedakan requirement baru vs inherited guarantee.
- [ ] Hard prerequisite mengontrol Ready/Locked; related/deep-dive tidak memblokir.
- [ ] Search menemukan item melalui ID, title, track, module, dan scope keyword.
- [ ] Semua exit criteria/project requirement memiliki tempat evidence.
- [ ] Availability, completion, dan review state tidak dicampur.
- [ ] Membaca, scroll, atau waktu tidak mengubah item menjadi passed.
- [ ] Historical evidence tetap dapat ditelusuri saat curriculum berubah.
- [ ] Keyboard, focus, screen reader, contrast, 320px reflow, dan zoom tetap memenuhi acceptance desain sebelumnya.
- [ ] Empty/error state compact dan tidak memenuhi layar tanpa alasan.

## Prioritas implementasi

```text
NOW
Curriculum V2 domain
→ Track / Module / Item
→ Checkpoint / Integration
→ Relation graph
→ validator

NEXT
Curriculum Explorer
→ icon rail
→ contextual panel
→ hierarchical progress
→ project workspace

LATER
Review engine
→ cross-track Connections view
→ generator context graph
→ richer evidence/search
```

Jangan polish sidebar lama sebelum Curriculum V2 tersedia; UI yang dibangun di atas flat task model akan perlu dibongkar lagi.
