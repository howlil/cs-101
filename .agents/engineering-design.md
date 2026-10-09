# CS-101 — Engineering design

> Kontrak folder dan dependency yang **aktif** ada di [`architecture.md`](architecture.md). Target tree dalam dokumen ini bersifat evolusi, bukan instruksi membuat layer yang belum diperlukan.

Updated · 7 Oktober 2026 · Mengikuti [product design](design.md)

CS-101 memakai **hierarchical curriculum + dependency graph + runtime learning state**. Curriculum adalah build-time/source data; progress dan evidence adalah runtime data. Production berjalan di Astro Cloudflare Workers + D1, sedangkan local development tetap dapat memakai Astro Node + SQLite.

Target arsitektur bukan LMS generik dan bukan graph platform. Curriculum saat ini sekitar ratusan item, sehingga struktur data sederhana, deterministic, dan tervalidasi lebih penting daripada infrastructure berat.

## System model

```mermaid
flowchart LR
  X[Curriculum source XLSX] --> I[Importer]
  I --> R[Raw snapshot]
  R --> N[Normalizer]
  N --> V[Graph validator]
  V --> M[Manifest V2]

  M --> C[Context resolver]
  C --> G[Course generator]
  S[Official sources] --> G
  G --> L[Lesson / project artifacts]
  L --> CV[Content validator]

  M --> B[Astro build]
  L --> B
  B --> A[Astro app]

  U[Browser] <--> A
  A --> LS[Learning application service]
  LS --> D[Domain rules]
  LS --> P[Learning storage]
  P --> Q1[(D1 production)]
  P --> Q2[(SQLite local)]
```

Ada dua lifecycle yang sengaja dipisahkan:

1. **Curriculum/content lifecycle**: import → normalize → validate → generate → build.
2. **Learning lifecycle**: browse → active item → session/evidence → completion → review.

Request browser tidak membaca spreadsheet, menjalankan generator, atau mengubah curriculum.

## Source of truth

| Data | Source of truth | Runtime |
| --- | --- | --- |
| Track/module/item structure | Curriculum source snapshot | Manifest V2 |
| Scope, challenge, criteria, project requirements | Curriculum source snapshot | Manifest V2 |
| Relations/prerequisites | Manifest V2 hasil normalisasi | In-memory graph indexes |
| Lesson content | MDX + generation metadata | Astro content |
| Active item/progress/review | Learning storage | D1 / SQLite |
| Evidence/session history | Learning storage | D1 / SQLite |
| Theme/draft input | Browser | localStorage/memory |

Curriculum source tidak dibaca dari D1. D1 menyimpan state learner, bukan curriculum authoring data.

## Curriculum Manifest V2

Flat `tasks[]` diganti menjadi model eksplisit.

```ts
type CurriculumManifestV2 = {
  version: 2;
  tracks: Track[];
  modules: Module[];
  items: CurriculumItem[];
  relations: Relation[];
};

type Track = {
  id: string;
  title: string;
  order: number;
};

type Module = {
  id: string;
  trackId: string;
  title: string;
  order: number;
  sourceLabel?: string;
};

type CurriculumItem =
  | LearningUnit
  | ProjectCheckpoint
  | IntegrationExercise;
```

### Learning unit

```ts
type LearningUnit = {
  id: ItemId;
  kind: "unit";
  trackId: string;
  moduleId: string;
  order: number;

  title: string;
  scope: string[];
  criteria: Criterion[];
  challenge: Challenge;

  prerequisites: ItemId[];
  source: SourceRef;
  estimatedMinutes?: number;

  fingerprint: string;
};
```

### Project checkpoint

```ts
type ProjectCheckpoint = {
  id: ItemId;
  kind: "checkpoint";
  trackId: string;
  moduleId: string;
  order: number;

  title: string;
  problemStatement: string;
  requirements: Criterion[];

  prerequisites: ItemId[];
  parentProjectId?: ItemId;

  source?: SourceRef;
  fingerprint: string;
};
```

### Integration exercise

```ts
type IntegrationExercise = {
  id: ItemId;
  kind: "integration";
  title: string;
  order: number;

  prerequisites: ItemId[];
  criteria: Criterion[];
  brief: string;

  fingerprint: string;
};
```

Integration tidak harus mempunyai satu `trackId` karena sifatnya lintas-track.

### Relation

```ts
type Relation = {
  from: ItemId;
  to: ItemId;
  type:
    | "prerequisite"
    | "foundation"
    | "related"
    | "deep_dive"
    | "contributes_to"
    | "project_parent";
};
```

Hanya `prerequisite` yang memblokir availability secara default. `project_parent` membentuk lineage. Relation lain adalah konteks/navigasi.

## Identifier rules

ID curriculum harus stable dan deterministic.

- Existing IDs seperti `JAV-001`, `SQL-P06`, `INT-001` dipertahankan.
- Module mendapat slug ID stabil seperti `java-core`, bukan hanya phase number.
- Phase/source label disimpan sebagai metadata bila perlu.
- Jangan memakai numeric phase sebagai identity; source dapat mempunyai label/nomor phase yang tidak unik.
- Criterion ID deterministic dan termasuk dalam fingerprint item.
- Perubahan presentation order tidak boleh mengubah ID.

## Curriculum import pipeline

```text
kurikulum.xlsx
   ↓
extract rows
   ↓
raw snapshot
   ↓
normalize
   ├─ track
   ├─ module
   ├─ unit
   ├─ checkpoint
   ├─ integration
   └─ relation
   ↓
validate
   ↓
manifest.v2.json
```

Importer harus deterministic. Input yang sama menghasilkan manifest byte-equivalent setelah canonical ordering.

### Normalization

Normalizer:

- memetakan sheet/jalur ke `Track`;
- memetakan phase/group source ke `Module` stabil;
- mengklasifikasikan `Jenis` menjadi unit/checkpoint/integration;
- memecah prerequisite menjadi ID eksplisit;
- mempertahankan scope/challenge/criteria/problem statement/requirements asli;
- memetakan cross-module reference ke typed relation jika format dikenali;
- menyimpan relation yang tidak dapat dipastikan sebagai validation issue, bukan menebak prerequisite;
- mengubah estimasi ke menit bila format dapat diparse tanpa ambiguity.

Jangan melakukan AI semantic deduplication pada requirement saat import.

## Validation

Build gagal jika invariant curriculum rusak.

Validator minimum:

- duplicate track/module/item ID;
- item menunjuk track/module yang tidak ada;
- missing hard prerequisite;
- cycle di hard-prerequisite graph;
- invalid project parent;
- cycle di project lineage;
- checkpoint parent berada pada lineage yang tidak konsisten;
- duplicate criterion ID dalam item;
- reserved/invalid criterion ID;
- relation target tidak ada;
- module/item order collision yang membuat output non-deterministic;
- integration tanpa prerequisite/criteria yang valid;
- stale lesson metadata terhadap fingerprint aktif.

Hard prerequisite cycle dicek dengan DFS/Kahn O(V+E). Dengan ratusan item, tidak perlu graph database.

## Graph indexes

Setelah manifest valid, bangun index read-only:

```ts
type CurriculumGraph = {
  tracksById: Map<TrackId, Track>;
  modulesById: Map<ModuleId, Module>;
  itemsById: Map<ItemId, CurriculumItem>;

  moduleItems: Map<ModuleId, ItemId[]>;
  prerequisites: Map<ItemId, ItemId[]>;
  dependents: Map<ItemId, ItemId[]>;

  relationsFrom: Map<ItemId, Relation[]>;
  relationsTo: Map<ItemId, Relation[]>;

  projectChildren: Map<ItemId, ItemId[]>;
};
```

Graph dibangun satu kali dari manifest, bukan query berulang ke database runtime.

## Availability dan state

Jangan menyimpan semua state sebagai satu enum.

### Availability

Derived dari graph + completion:

```ts
isReady(itemId) =
  prerequisites(itemId).every(id => completion(id) === "passed")
```

Nilai:

- `locked`
- `ready`

Availability tidak perlu persisted sebagai source of truth.

### Completion

Persisted:

- `not_started`
- `active`
- `passed`
- `stale`

`stale` berarti curriculum fingerprint aktif berbeda dari fingerprint yang digunakan saat passed.

### Review

Persisted/derived dari schedule:

- `none`
- `scheduled`
- `due`
- `retry`
- `retained`

Review tidak mengubah historical completion evidence.

## Cumulative project lineage

Checkpoint menggunakan `parentProjectId`.

```text
JAV-P01
  ↓
JAV-P02
  ↓
JAV-P03
```

Untuk presentation, hitung:

```ts
inheritedRequirements(project)
newRequirements(project)
```

Source requirement tetap utuh.

Untuk deterministic delta awal, gunakan normalized exact text/stable requirement fingerprint. Jangan menghapus requirement hanya karena semantic similarity.

Jika source checkpoint secara eksplisit menyatakan "includes every requirement from Project N", importer boleh membentuk lineage, tetapi tetap simpan source text asli.

## Content artifacts

Jenis item mempunyai artifact berbeda:

| Item kind | Artifact |
| --- | --- |
| unit | MDX lesson |
| checkpoint | Project spec/workspace metadata + optional MDX explanation |
| integration | Integration brief/workspace metadata |
| review | Runtime assessment instance |

Jangan memaksa checkpoint menjadi lesson MDX biasa.

## Generator context resolver

Generator tidak menerima seluruh curriculum.

Untuk satu unit, context resolver menyiapkan packet:

```text
current item
direct prerequisites
current module
nearest checkpoint
project lineage context
selected related/deep-dive items
source refs
```

Pemilihan context deterministic dari graph. Model tidak memilih dependency sendiri.

Generation flow:

1. Resolve satu unit + bounded graph context dengan `generation:prepare`.
2. Fetch/review 1–5 authoritative sources dan tulis source pack.
3. Tulis lesson spec sebelum prose; spec memuat coverage + lima review questions.
4. Tulis lesson MDX di staging.
5. `generation:validate` memeriksa fingerprint, source, coverage, review coverage, frontmatter, component imports, prerequisite links, dan source links.
6. Validator menurunkan generation record + review bank serta content hashes.
7. `generation:promote` menolak bundle yang berubah setelah validation lalu memindahkan artifact ke release paths.

Perubahan fingerprint membuat artifact lama stale, tetapi tidak menghapus historical evidence.

## Learning application service

Validasi session, activation, dan review eligibility kini shared di `src/domain/learning/decisions.ts`; SQLite dan D1 tetap memiliki transactional implementation berbeda. Evolusi berikutnya jika dibutuhkan:

```text
HTTP/API
   ↓
LearningApplicationService
   ↓
shared domain rules
   ↓
LearningStorage
   ├─ SQLiteStorage
   └─ D1Storage
```

Jangan membuat repository abstraction per tabel. Ekstrak kontrak yang benar-benar dibutuhkan use-case.

Domain rules yang harus shared:

- validasi active item;
- hard prerequisite / ready check;
- evidence terhadap criterion;
- completion transition;
- stale fingerprint behavior;
- review rules;
- project/integration completion rules;
- idempotency semantics;
- revision conflict semantics.

Transaction implementation boleh berbeda antara SQLite dan D1.

## Runtime data model

Target schema mengganti nama task-specific menjadi item-generic.

### learner_state

```text
id
active_item_id
revision
```

### item_progress

```text
item_id PK
completion_status
passed_fingerprint
last_anchor
continue_from
started_at?
passed_at?
```

Availability tidak disimpan.

### sessions

Append-only:

```text
id
item_id
recorded_at
kind
fingerprint
continue_from
minutes?
payload
```

### evidence

```text
id
item_id
kind
value
recorded_at
fingerprint
session_id?
```

### criterion_evidence

Many-to-many:

```text
evidence_id
item_id
criterion_id
criterion_fingerprint
```

Satu evidence dapat mendukung beberapa criteria; mapping harus eksplisit.

### review_attempts

```text
id
item_id
question_set_version
answers
grading_mode
score
assisted
result
recorded_at
```

### review_schedule

```text
item_id
policy_version
step
due_at?
state
```

Policy v1: interval 1 → 3 → 7 → 14 → 30 hari. Interval ini adalah policy aplikasi dan tidak berasal dari curriculum workbook. `due` diturunkan dari `scheduled + due_at <= now`; `retry` dan `retained` disimpan eksplisit.

### request_receipts

```text
request_id
payload_hash
response
nonce / implementation metadata
```

Digunakan untuk retry-safe mutation.

## Completion invariant

Unit passed hanya jika:

- semua required criteria mempunyai evidence;
- challenge requirement yang diwajibkan terpenuhi;
- fingerprint cocok dengan curriculum aktif;
- assessment rule yang dipakai product terpenuhi.

Checkpoint passed hanya jika seluruh active project requirements evidenced.

Integration passed hanya jika seluruh integration criteria evidenced.

Server menghitung status. Browser tidak boleh mengirim arbitrary `status=passed`.

Waktu belajar, scroll position, membuka solution, dan keberadaan lesson tidak dapat meluluskan item.

## API target

| Endpoint | Kontrak |
| --- | --- |
| `GET /api/learning` | active item, continuation, completion/review state, revision |
| `GET /api/curriculum/state` | optional compact derived availability/completion map |
| `POST /api/active-item` | ganti active item; cek readiness; simpan draft previous session secara atomik |
| `POST /api/sessions` | append session/progress |
| `POST /api/evidence` | simpan evidence + criterion mapping |
| `POST /api/complete` | validasi DoD lalu transition ke passed |
| `POST /api/reviews` | simpan attempt + schedule |
| `GET /api/export` | export learning state + evidence/session history |

Endpoint dapat digabung pada tahap awal selama domain contract tetap jelas.

Semua mutation membawa:

- `requestId`
- expected `revision`

Retry identik mengembalikan receipt lama. Payload berbeda dengan request ID sama → 409. Revision conflict → 409. Invalid domain input → 422. Storage unavailable → 503.

## Local dan production storage

### Production

- Astro Cloudflare adapter.
- Cloudflare Worker.
- D1 binding `LEARNING_DB`.
- Static assets dari Astro build.
- Curriculum manifest dan content ikut release artifact.
- D1 hanya learning state.

### Local

- Astro Node config.
- SQLite file.
- Schema/domain behavior sama.
- Storage-specific transaction implementation berbeda.

Tidak ada fallback diam-diam dari production D1 ke local SQLite. Jika production binding tidak tersedia, fail fast dengan error yang dapat didiagnosis.

## Transaction semantics

Mutation learning harus atomic pada boundary use-case.

Contoh complete item:

```text
check receipt
check revision
load current progress
validate curriculum fingerprint
validate prerequisite/completion rules
validate evidence coverage
write progress transition
write session/event if needed
write receipt
commit
```

SQLite dapat memakai `BEGIN IMMEDIATE`. D1 menggunakan batch/conditional writes sesuai kemampuan adapter. Domain outcome harus setara.

## Search

Manifest dapat membangun search index lokal:

```ts
{
  itemId,
  title,
  trackTitle,
  moduleTitle,
  scopeKeywords
}
```

Search dilakukan client-side atau server-side dari artifact kecil. Tidak perlu Algolia/Elasticsearch untuk ukuran curriculum ini.

## Frontend runtime boundary

Astro adalah content/server shell, bukan interaction runtime.

```text
Astro page/layout
  ↓ serializable props
React island
  ↓ UIArc primitives
HTTP API
  ↓
Learning service
```

Rules:

- Astro: route, SSR fetch, manifest/content/MDX rendering.
- React: seluruh page shell, app shell, stateful interaction, mutation, local draft, disclosure, search, theme, loading/error feedback.
- UIArc: source-owned interactive primitives only. Product composition lives in `src/components/ui`, while page/domain composition stays in its feature folder.
- `pnpm validate:ui` memblokir page markup di route Astro, native interactive controls dan direct Radix imports di luar UIArc, product composition di root `arc/`, dan glyph teks yang dipakai sebagai icon.
- Tidak ada imperative DOM orchestration seperti `document.querySelector(...).addEventListener(...)` untuk application behavior.
- Tidak ada native `<details>` untuk product disclosure; gunakan React + UIArc Accordion.
- Focus ring/halo dilarang oleh product decision; focus-visible harus tetap dibedakan lewat border/background.
- Astro dapat merender React component tanpa hydration bila benar-benar statis. Tambahkan `client:*` hanya jika component membutuhkan interaction.

## UI view models

React/Astro component tidak membaca graph raw.

Bangun selector/view-model layer:

```ts
getTrackExplorer(trackId)
getItemHeader(itemId)
getItemConnections(itemId)
getProjectDelta(projectId)
getTodayView()
getProgressOverview()
```

Contoh:

```ts
type ModuleView = {
  id: string;
  title: string;
  completed: number;
  total: number;
  items: ItemRowView[];
};
```

Ini menjaga UI dari business logic dependency.

## Migration dari V1

Current V1:

```text
Task
track
phase
order
prerequisites
criteria
challenge
projectRequirements
```

Target V2:

```text
Track
Module
CurriculumItem
  ├─ Unit
  ├─ Checkpoint
  └─ Integration
Relation[]
```

Migration dilakukan bertahap:

1. Tambah schema V2 dan importer tanpa menghapus V1.
2. Generate `manifest.v2.json` dari curriculum source.
3. Tambah adapter/selectors sehingga UI baru membaca V2.
4. Ubah `task_progress` → `item_progress` melalui migration storage yang menjaga historical rows.
5. Ubah `active_task_id` → `active_item_id`.
6. Pisahkan project requirements dari unit.
7. Tambah evidence tables dan backfill evidence dari session payload bila aman.
8. Setelah test migration/export lulus, hapus compatibility V1.

Historical Task ID tetap valid karena unit ID existing dipertahankan.

## Repository target

```text
cs-101/
├── curriculum/
│   ├── raw/
│   ├── manifest.v2.json
│   └── import-report.json
├── generation/
│   └── <ITEM-ID>.json
├── scripts/
│   ├── import-curriculum.ts
│   ├── validate-curriculum.ts
│   └── validate-content.ts
├── src/
│   ├── content/lessons/
│   ├── domain/
│   │   ├── curriculum/
│   │   │   ├── schema.ts
│   │   │   ├── graph.ts
│   │   │   ├── selectors.ts
│   │   │   └── fingerprint.ts
│   │   └── learning/
│   │       ├── rules.ts
│   │       └── schema.ts
│   ├── server/
│   │   ├── learning-service.ts
│   │   └── storage/
│   │       ├── d1.ts
│   │       └── sqlite.ts
│   ├── components/
│   │   ├── curriculum/
│   │   └── course/
│   ├── layouts/
│   └── pages/
├── migrations/
└── tests/
```

Struktur boleh disederhanakan selama boundaries tetap sama.

## Test strategy

### Curriculum

- parser fixture untuk setiap track/item kind;
- deterministic manifest snapshot;
- missing prerequisite;
- duplicate ID;
- prerequisite cycle;
- broken project lineage;
- unresolved relation;
- module ordering;
- exact requirement delta.

### Domain learning

- locked item tidak dapat dijadikan active melalui protected transition;
- ready setelah semua prerequisite passed;
- passed but stale setelah fingerprint berubah;
- evidence missing ditolak;
- satu evidence mendukung beberapa criteria;
- project/integration completion;
- review assisted tidak dianggap passed;
- request retry idempotent;
- revision conflict.

### Storage contract

Jalankan behavior suite yang sama terhadap SQLite dan D1 adapter sejauh environment memungkinkan.

### UI

- explorer tidak expand semua track;
- active module/item terlihat;
- project menunjukkan new vs inherited requirements;
- integration menunjukkan missing prerequisite;
- search membuka item benar;
- Today menampilkan active/next-ready yang benar;
- accessibility keyboard/focus/reflow.

## Deployment

Build dan release sengaja dipisahkan:

```text
pnpm run build
  ↓
scripts/build.mjs
  ├─ local / GitHub CI → build:app
  │    └─ validate → Astro build
  │       NO remote database mutation
  │
  └─ Cloudflare Workers Builds (WORKERS_CI=1) → build:cloudflare
       └─ pending D1 migrations → validate → Astro build

Manual release:
pnpm run build:cloudflare
  ↓
npx wrangler deploy
```

Deployment command tetap `npx wrangler deploy` pada Cloudflare. Preparation berada pada build workflow sesuai repository contract saat ini.

Database migration harus idempotent dan dijalankan sebelum release yang membutuhkan schema baru. Jangan deploy code yang membaca kolom/table baru sebelum migration tersedia.

## Observability

Catat metadata operasional, bukan isi evidence pribadi:

- request ID;
- route/use-case;
- item ID;
- storage adapter;
- duration;
- error category;
- revision conflict;
- curriculum fingerprint mismatch.

Untuk production failure, log harus membedakan:

```text
curriculum validation
content/build
missing binding
D1/schema
domain validation
revision conflict
runtime render
```

## Production hardening

CI memakai Node 24 dan menjalankan gate berikut pada push/PR ke `master`:

```text
pnpm test
  ↓
astro check
  ↓
safe Node build
  ↓
HTTP smoke: /, /curriculum, /progress
```

`pnpm run build` memilih target berdasarkan environment. Pada local/GitHub CI ia menjalankan pure `build:app` tanpa remote mutation. Pada Cloudflare Workers Builds (`WORKERS_CI=1`) ia menjalankan `build:cloudflare`, yaitu pending D1 migration lalu validated app build. Explicit `pnpm run build:cloudflare` / `pnpm run deploy:cloudflare` tetap tersedia untuk release manual.

SQLite dan D1 memiliki transaction implementation berbeda, tetapi behavior contract diuji dengan parity suite yang sama untuk activation, completion, idempotent retry, readiness, dan review.

Compatibility V1 (`active_task_id`, `task_progress`, alias `taskId`, legacy endpoint) tetap sementara untuk migration safety. Jangan drop sampai ada migration/drop test yang membuktikan historical data dan old clients aman.

## Implementation roadmap

| Phase | Outcome | Definition of done |
| --- | --- | --- |
| P0 Curriculum V2 | Importer, Track/Module/Item, relation graph | Workbook menjadi manifest deterministic; invalid graph gagal build |
| P1 Explorer | Icon rail + contextual curriculum explorer | Ratusan item tetap navigable tanpa flat sidebar |
| P2 Generic learning state | item_progress, active item, readiness | Unit/checkpoint/integration memakai state engine sama |
| P3 Project workflow | lineage + requirement delta + project evidence | Cumulative checkpoint dapat dikerjakan tanpa duplicate wall-of-text |
| P4 Cross-module graph | typed relations + Connections selector/UI | Related/deep-dive terlihat tanpa menjadi prerequisite |
| P5 Review engine ✅ | attempts + schedule + retention | Review due/retry/retained konsisten |
| P6 Generator context ✅ | graph-aware staged generation + review bank | Generator menerima bounded prerequisite/project context; bundle tervalidasi sebelum promotion |
| P7 Progress + search ✅ | view-model driven progress + ranked global/local search | User dapat menemukan dan memahami posisi di curriculum besar tanpa business logic di page |
| P8 Stabilization ✅ | Node 24 CI + safe build + SQLite/D1 parity + smoke | Test/check/build/runtime gate hijau tanpa build biasa memutasi production D1 |

## Engineering acceptance

- [ ] Manifest V2 mempertahankan scope, challenge, exit criteria, problem statement, project requirements, dan source dari curriculum.
- [ ] Track/module/item ID deterministic.
- [ ] Hard-prerequisite graph bebas cycle dan missing node.
- [ ] Project lineage valid dan requirement delta deterministic.
- [ ] Related/deep-dive tidak memblokir readiness.
- [ ] Availability derived, bukan persisted source of truth.
- [ ] Completion tidak berasal dari waktu/scroll/content existence.
- [ ] Unit/checkpoint/integration memakai shared learning rules.
- [ ] SQLite dan D1 memberi domain outcome yang sama untuk mutation contract.
- [ ] Historical evidence tetap dapat dibaca setelah curriculum fingerprint berubah.
- [ ] Retry tidak menggandakan session/evidence.
- [ ] Revision conflict tidak menimpa perubahan tab lain.
- [ ] Curriculum source tidak dibaca per-request di production.
- [ ] UI tidak mengandung dependency business logic.
- [ ] Build/deploy gagal secara diagnostik jika manifest, migration, atau D1 binding invalid.

## Keputusan eksplisit

- Tidak memakai graph database.
- Tidak memakai search service eksternal.
- Tidak membaca XLSX saat request runtime.
- Tidak menjadikan semua cross-module reference sebagai prerequisite.
- Tidak menjadikan project sebagai unit lesson biasa.
- Tidak mengganti historical ID ketika berpindah ke Manifest V2.
- Tidak menambah multi-user/auth model sampai kebutuhan itu menjadi scope produk.


## P7 view-model boundary

### Learning view models

`src/domain/learning/view-models.ts` menjadi boundary presentation untuk Today, Curriculum state marker, dan Progress.

Page tidak menghitung ulang:

- current focus;
- passed/stale;
- ready/locked;
- actionable review;
- module/track completion.

`started` adalah derived presentation state untuk row progress lama yang pernah aktif tetapi bukan `activeItemId` saat ini. Storage schema tetap `active|passed` selama compatibility window.

### Search

`buildCurriculumSearchIndex()` menghasilkan index lokal dari Item ID, title, track, module, dan scope. `searchCurriculum()` melakukan deterministic ranking tanpa service eksternal.

Global palette di AppLayout memakai `Ctrl/⌘ K`; Curriculum memiliki inline filter lokal tanpa shortcut global.
