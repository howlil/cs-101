# CS-101 — Engineering Content Library

CS-101 is a **single-page content library** for engineering lessons, practice questions, and project ideas.

**Current content status:** 8 tracks, 67 modules and 370 source-backed curriculum entries. NET-001 (Request Path), NET-006 (TCP Handshake Capture), SPR-006 (Transfer API), OSX-029 (Binding Mystery), PRD-002 (Health Contract), JAV-001 (Build Doctor), SQL-001 (SQL Workbench), TST-007 (Money Unit Tests) and SYS-008 (Transfer API Spec) are authored Pedagogy V3 lessons. All other unauthored units remain outlines.

- One page: `/` with Library and Knowledge Graph modes. Knowledge Graph has an interactive deterministic one-hop SVG node–edge canvas with pan/zoom, selected concept deep links and an accessible text-link alternative; dashed edges are proposed relationships, not prerequisites.
- Cross-domain pilot: nine proposed curated concepts link Java build, Spring Boot, PostgreSQL, testing and system-level transfer API design to HTTP/network/production. `/?mode=graph&concept=http-request-lifecycle&level=G1` and `&level=G2` preserve distinct competency evidence; `/?mode=graph&concept=java-build-toolchain&level=G1` and `/?mode=graph&concept=api-design-contract&level=G1` open new neighborhoods. New concepts have G1 only; unmapped G2 stays a gap.
- G0, G3 and G4 remain visible as uncurated depth gaps, not fabricated lessons.
- Suggested cross-domain study paths: `/?mode=graph&concept=http-request-lifecycle&level=G1` → `/?item=NET-001&concept=http-request-lifecycle&level=G1` → Materi/Soal (when authored)/Project → next unit. URL context is not learner progress.
- Path traversal uses only reviewed `requires` relations as prerequisites. Current pilot has none; ordered units are editorial suggestions.
- Curated relations and competency outcomes are validated against canonical unit IDs; workbook imports are unchanged.
- Each G1/G2 pilot outcome has a **proposed assessment blueprint** (task, checks, pass conditions, required evidence kind and linked curriculum unit). Graph and contextual Project views show whether a criterion needs design review, a real framework test, a peer-network lab, a packet trace or a Kubernetes test. Local runnable fixtures alone do not satisfy lab/cluster criteria. Rubrics are not automatically scored.
- Sidebar: domain selector, module accordion, and curriculum topics. Mapped lesson Materi pages embed a reusable node–edge preview with a full Graph link; unmapped units show an honest gap and a global Graph entry.
- Content: NET-001, NET-006, SPR-006, OSX-029, PRD-002, JAV-001, SQL-001, TST-007 and SYS-008 are published with complete V3 content and five self-check questions each. Seven units have bounded Node/Java fixtures, including SYS-008's static OpenAPI contract checker; SQL-001 and TST-007 use separate PostgreSQL/JUnit integration gates. The other 361 units remain outlines.
- SYS-008 has a machine-readable OpenAPI 3.1.1 contract at contracts/SYS-008/transfer-api.openapi.json and a source-backed static checker for endpoint/status/problem examples and optional-field compatibility. This does **not** execute real HTTP, Spring MVC, authorization, payment settlement or full OpenAPI schema conformance; real client/framework reviews remain explicit follow-ups. TST-007's 20 JUnit Jupiter tests run through real Java 21 Maven Surefire in CI with nonzero test discovery, no Spring context and zero failures; its V3 generator reports not-executable because it does not run Maven/JUnit. The example fee policy is for learning only, not production financial pricing. SQL-001's labs/SQL-001/init.sql and inspect.sql run against a disposable PostgreSQL 16 container in CI, proving six actual query observations, repeatable seed initialization and FK failure. Its V3 generator explicitly reports not-executable because only Node/Java are supported; the real database verification is a separate CI step, not a fabricated generator proof. NET-006's local Node socket fixture proves stream connection, bytes, EOF and refusal, not captured SYN/SYN-ACK/ACK, FIN/RST or retransmission; the packet-trace learner lab remains separate. JAV-001's JDK 21 JavaCompiler fixture proves compile-time versus runtime class-loading failures, not actual Maven verify or executable JAR packaging. SPR-006's Java fixture proves HTTP protocol behavior, not Spring integration. OSX-029's Node fixture proves local bind only. PRD-002's Node HTTP fixture simulates state-driven /live and /ready statuses; actual database failure, Spring Boot Actuator wiring and Kubernetes routing/restart behaviors require separate integration verification.
- Editorial competency rubrics and graph relations remain proposed; Java build evidence needs real Maven CLI output and SQL schema evidence needs an actual PostgreSQL instance; published content does not imply assessment mastery. Spring Boot can reject new probe connections during graceful shutdown even while the local PRD-002 fixture returns HTTP 503 for drain.
- Projects: project checkpoints and integration challenges from the curriculum manifest.
- No learner account, progress, study sessions, evidence submission, spaced repetition, database reads or writes.
- Existing Cloudflare D1 data is **not deleted** by this refactor. The application simply stops using the binding.

## SQL-001 — PostgreSQL integration

The web app does **not** use a database. SQL-001 is an offline, isolated learning lab:

```sh
bash labs/SQL-001/verify-postgres.sh
```

This requires Docker and starts a temporary PostgreSQL 16 container with no published port, checks six SELECT results in a clean and replayed database, tests two foreign keys, then removes the container. Do not run fixture scripts against production databases.

## TST-007 — JUnit 5 Money Unit Tests

This pure Java 21 lab defines an explicitly **educational** 1.5% fee policy with a 1,000,000-unit principal cap. IDR has zero fractional digits; USD has two; the fee rounds HALF_UP. There is **no Spring Boot context, real tariff, FX conversion or database**.

```sh
mvn -B -ntp -f labs/TST-007/pom.xml clean verify
python3 labs/TST-007/verify-surefire.py
```

The verifier checks an actual Surefire XML report for 20 tests, zero failures/errors/skipped, and a Spring-free POM. The V3 generator cannot execute the Maven/JUnit build; its reason is explicit and the separate CI step provides actual JUnit evidence.

## SYS-008 — Transfer API design contract

`contracts/SYS-008/transfer-api.openapi.json` is an OpenAPI 3.1.1 **design proposal**, with three routes, request/response examples, HTTP status choices, RFC 9457 Problem Details and an additive optional response-field example.

```sh
node generation/fixtures/SYS-008/contract-review.mjs
```

The checker reads the tracked OpenAPI file and verifies a **bounded subset** of status/shape contracts and one explicitly tolerant legacy-client example. It does not validate every OpenAPI keyword, run a Spring controller, authenticate tokens, or prove transfer settlement/idempotency. Runtime integration must be tested separately.

## Local

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm ci
```

## Cloudflare Workers

```sh
pnpm run build:cloudflare
npx wrangler deploy
```

Workers Builds:
- Build: `pnpm run build:cloudflare`
- Deploy: `npx wrangler deploy`
- Root: `/`

Cloudflare no longer needs the `LEARNING_DB` binding or migrations.

## Generate lessons

The canonical curriculum is `curriculum/manifest.v2.json`. Once a new reviewed curriculum is imported, only authored units will have complete MDX content; other units will display verified outlines.

```sh
pnpm generation:prepare JAV-003
# fill staged source-pack, lesson-spec and lesson.mdx
pnpm generation:validate JAV-003
pnpm generation:promote JAV-003
pnpm ci
```

Generator outputs:
- `src/content/lessons/<ID>.mdx` — study material, practice, challenges
- `generation/<ID>.json` — provenance + coverage
- `review-banks/<ID>.json` — reusable question bank (not a scheduled review system)

Projects/integrations are rendered directly from the curriculum manifest. Old deep links redirect to `/?item=<ID>`.
