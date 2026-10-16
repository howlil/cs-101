# Read-only content workflow

```text
Curriculum Manifest V2
   ├── Unit → authored MDX + question bank → Materi / Latihan soal
   ├── Checkpoint → project problem + requirements → Ide project
   └── Integration → cross-domain scenario → Latihan integrasi
               ↓
         /?item=<ITEM-ID>
```

Content availability states:
- **Authored**: validated MDX lesson exists and matches the item fingerprint.
- **Outline**: no MDX lesson yet; show only the explicitly curated scope/challenge from the manifest.
- **Stale**: authored content fingerprint differs from the manifest; flag it for regeneration.

No learning account or persistence exists. The browser can show immediate, local quiz feedback but **does not store scores, completion, evidence, or review schedules**. A user can jump to any domain or item at any time.

## Navigation

The single root page uses `?track=<DOMAIN-ID>` and `?item=<ITEM-ID>`. The sidebar owns the domain select and module accordion. Old /learn, /project, /review, /progress and /curriculum links redirect to root.

## Verification

Check primary-source accuracy, challenge alignment, question explanations, responsive MDX rendering, static project linking, accessible sidebar interactions, and no active learner API or database binding.
