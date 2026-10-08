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
Kerjakan latihan / project
  ↓
Simpan bukti
  ↓
Selesai
  ↓
Review
  ↓
Item berikutnya menjadi ready
```

## Vocabulary produk

Domain dan UI **tidak harus memakai vocabulary yang sama**. Domain tetap presisi; UI memakai bahasa kerja yang mudah dikenali.

| Domain internal | UI | Makna user |
| --- | --- | --- |
| unit | Materi | Satu materi yang dikerjakan |
| checkpoint | Project | Project kumulatif |
| integration | Latihan gabungan | Latihan yang memakai beberapa jalur |
| scope | Yang perlu dikuasai | Materi inti |
| challenge | Latihan | Pekerjaan yang harus dilakukan |
| criterion | Selesai jika | Syarat yang harus terbukti |
| evidence | Bukti | Link/output/catatan yang membuktikan target |
| ready | Bisa dimulai | Semua prasyarat sudah selesai |
| retention | Jadwal review | Kapan perlu mengulang recall |
| deep_dive | Pendalaman | Materi lanjutan opsional |
| contributes_to | Dipakai di project | Materi ini dipakai oleh project |

Istilah domain seperti `delta`, `inherited guarantee`, `readiness`, atau `retained` boleh tetap hidup di code/engineering docs, tetapi jangan dijadikan vocabulary wajib bagi learner.

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
7. **Cross-track relation terlihat saat dibutuhkan.** Tampilkan Harus selesai dulu, Dipakai nanti, Terkait, dan Pendalaman di context section.
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
│ CS-101                                  Search  Theme │
├────┬───────────────────────┬──────────────────────────┤
│ 🏠 │ Contextual explorer   │ Main workspace           │
│ 📚 │ independent scroll    │ independent scroll       │
│ 📈 │                       │                          │
└────┴───────────────────────┴──────────────────────────┘
 56px        ~236px
```

### Global rail

- Compact density memakai `data-density="compact"`.
- Lebar rail 56 px.
- Icon-only untuk Hari ini, Kurikulum, Progres.
- Tooltip, `title`, dan accessible name wajib.
- Active state jelas.
- Tidak menaruh daftar materi di rail.
- Utility seperti settings hanya jika benar-benar ada fungsi.

### Contextual explorer

Panel kedua muncul saat konteks membutuhkan hierarchy: `/curriculum`, `/learn/*`, `/project/*`, dan `/integration/*`. Pada route item, contextual explorer adalah bagian dari AppShell, bukan komponen lokal halaman.

Pada desktop, explorer **visible by default** dan current item harus ter-highlight. Link item dari contextual explorer membuka artifact aslinya (`/learn`, `/project`, atau `/integration`), bukan kembali ke preview Curriculum.

Explorer dan workspace adalah dua scroll container independen. Explorer mempertahankan posisi scroll ketika user membuka item lain; workspace detail selalu dapat dibaca tanpa menggeser hierarchy. Di viewport ≤900 px contextual explorer boleh disembunyikan sampai drawer/collapsible navigation tersedia.

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

- Shell memakai ruang horizontal yang tersedia; jangan membatasi page frame ke ukuran artikel.
- **Page frame dan reading measure adalah dua hal berbeda.** Workbench desktop boleh sampai ±1500 px dan harus centered; prose tetap sekitar 72–76ch.
- Jangan meninggalkan semua surplus width di kanan karena container max-width yang menempel kiri. Sisa ruang desktop harus seimbang melalui centered workbench.
- Desktop lebar memakai pola **adaptive workbench**: primary region elastis + context rail sekitar 300–320 px bila ada konteks sekunder yang membantu keputusan.
- Primary region boleh melebar untuk matrix, rows, evidence, requirement, dan progress; paragraph/readable children tetap dibatasi ±860 px.
- Context rail hanya untuk state/action, next step, readiness/prerequisite, TOC, review, lineage, atau connections. Jangan mengisinya dengan dekorasi agar ruang terlihat penuh.
- Header halaman compact: breadcrumb/ID/title hanya jika informasinya mengubah orientasi.
- Hapus subtitle generik, helper copy yang mengulang CTA, dan panel dekoratif.
- Tidak ada hero marketing atau stat cards generic di Hari ini.

Pola desktop:

```text
Centered workbench ≤1500 px
┌──────────────────────────────────────────────────────────────┐
│ Primary region, elastic              Context rail 300–320px │
│ ├─ readable prose ≤76ch              state / next / deps    │
│ └─ rows/matrix/evidence may expand   TOC / review / lineage │
└──────────────────────────────────────────────────────────────┘
```

Jika tidak ada konteks sekunder yang berguna, primary area tidak perlu dipaksa memiliki rail kosong.

### Responsive

- Desktop ≥1100 px: primary + context rail bila konteks sekunder tersedia; curriculum tetap explorer + detail workspace.
- Tablet 768–1099 px: context rail turun menjadi block sebelum/di atas konten utama; jangan sisakan kolom kosong.
- Curriculum explorer tetap independen; pada viewport sempit dapat berubah menjadi stacked/collapsible flow.
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

Global search palette tersedia dari seluruh app melalui `Ctrl/⌘ K`. Ranking memprioritaskan exact Item ID, lalu title, module/track, kemudian scope keyword. Inline search pada Curriculum tetap ada sebagai filter lokal dan tidak memiliki global keyboard shortcut sendiri.

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

Melanjutkan dari
Project 1 · Adversarial Ledger Kernel

Yang baru di project ini
+ target baru
+ target baru
+ target baru

Dari project sebelumnya
12 target tetap harus benar
[Lihat target sebelumnya]

Bukti
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

Harus selesai dulu
Java foundation     ✓
SQL foundation      ✓
Linux foundation    ○

Terkunci
LIN-001 belum selesai
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

Derived presentation state `started` boleh dipakai di UI untuk item yang sudah punya session/progress lama tetapi bukan `activeItemId` saat ini. `started` bukan persisted completion enum baru; hanya mencegah UI menampilkan beberapa item sebagai focus aktif.

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
| Lesson belum tersedia | Tampilkan fallback curriculum: Yang perlu dikuasai, Latihan, Selesai jika, Sumber, session, dan Bukti. |
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
| Mulai perjalanan belajarmu | Mulai belajar |
| Unlock your potential | Continue |
| Selamat! Kamu luar biasa! | Jawaban benar. [alasan] |
| Terjadi kesalahan | Sesi belum tersimpan. Coba lagi. |
| Progress 73% karena waktu | 3 dari 5 target punya bukti |

Hindari pembuka generik, motivasi otomatis, angka vanity, dan rekap yang tidak menambah keputusan.

## UI runtime boundary

Gunakan boundary berikut secara konsisten:

```text
Astro
├─ routing
├─ SSR data loading
├─ MDX/content composition
└─ static semantic structure

React
├─ mutation
├─ client state
├─ search/select
├─ disclosure/accordion/dialog
├─ theme
├─ draft persistence
└─ feedback/loading transitions

UIArc
├─ Button
├─ Input / Textarea / Radio / Select
├─ Accordion / Alert / Badge
├─ Card/surface language
└─ motion + tokens
```

Jangan menambah `querySelector`, global `addEventListener` untuk feature interaction, atau native interactive disclosure baru di Astro. Native anchor/navigation tetap boleh karena itu semantic navigation, bukan client state.

Product decision: **tidak memakai focus ring/halo**. Keyboard focus tetap harus terlihat melalui perubahan border/background/foreground pada primitive UIArc.

Box/surface baru tidak boleh membuat radius, border, shadow, atau motion language sendiri. Gunakan primitive UIArc jika interaktif; untuk content statis gunakan token UIArc seperti `--radius-control`, `--radius-panel`, `--border`, `--surface`, dan `--shadow-resting`.

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
- [ ] Contextual curriculum explorer tetap terlihat di desktop pada `/learn/*`, `/project/*`, dan `/integration/*`, dengan current item ter-highlight.
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


## Implementation update — Unified sidebar (October 2026)

The application chrome now uses one route-aware sidebar for global navigation and the contextual curriculum hierarchy. The global icon rail and the Curriculum page's second explorer are retired. AppLayout builds the sidebar view from the manifest and the request-scoped learning snapshot; the feature UI never derives learner completion from client storage.

- Desktop: 248px sidebar; compact mode 56px, persisted as cs101:sidebar-collapsed.
- At <=900px, Arc Dialog presents the same hierarchy in a keyboard-accessible drawer.
- Only the current track and one relevant module expand by default. /curriculum keeps its preview URL contract; lesson/project/integration sidebar items link to their real routes.
- Scroll position is session-scoped per track, not persisted as a learner domain fact.
- Astro ClientRouter continues swapping route workspaces. SSR remains Cache-Control: no-store.
- Howlil neutrals and typography are shared through tokens.css rather than adding an independent component palette.
- The second phase will move lesson content into structured Pahami/Latihan/Bukti stages without changing learning-domain semantics.


## SQL-001 lesson vertical slice — October 2026

SQL-001 is the first staged curriculum lesson. Its original MDX content is retained, but authored Astro LessonStage boundaries separate concept reading, practice, and evidence. LessonPage switches the visible stage using accessible tabs and a URL hash without DOM reparenting, and keeps references with the reading content and contextual connections behind an optional disclosure. QuizClient remains the original learning UI. The existing SessionLogger/EvidenceForm and /api/sessions validation remain the sole owners of saving progress and passing; SQL-001 opens its existing evidence group by default. No client-side quiz score sets domain completion. All other lessons and the demo retain their prior linear rendering until separately migrated.


## Phase 05 — task-first workspace parity (October 2026)

Navigation hierarchy belongs solely to AppSidebar across Today, Curriculum, Progress, Lesson, Project, Integration, and Review. AppLayout selects the relevant track from the route item (including Review), or the request-scoped learner active item (Today/Progress). Selecting a route never mutates learner activation or completion.

- Today renders a single next action first; blocker stays visible, optional business context uses Arc Accordion, due review remains a secondary action.
- Progress renders per-track completion as Arc Accordion disclosures rather than a second full curriculum tree. Actionable reviews and integration status precede the session history; the export endpoint and full history remain unchanged.
- Project renders current requirements/evidence directly and keeps contributors, lineage, and connections available in one disclosure. Inherited guarantees remain part of the primary requirement flow.
- Integration renders scope/challenge/requirements/evidence directly. Prerequisite completion count is in the disclosure label; full links and relations remain accessible.
- Review is a single centered recall workspace; status and optional schedule sit inline before the attempt, with no permanent context rail.
- There is exactly one semantic page main region, owned by AppLayout. Individual workspaces use sections/divs, never nested main.
- No changes to curriculum schema, learning domain, evidence persistence, review scheduling, or API contracts. Maintain focusable controls and reduced-motion behavior through Arc primitives.
