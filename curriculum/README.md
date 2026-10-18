# CS-101 curriculum source

The canonical curriculum is `curriculum/manifest.v2.json`, derived from the 8-domain,
370-topic source snapshot at `curriculum/source/engineering-2026-10-18.json`.

Use:
```sh
pnpm curriculum:verify-import
pnpm curriculum:status
pnpm curriculum:import-eight --write
```

Only the eight-domain importer is supported. Review the source snapshot and changes
before using `--write`; it updates the manifest. Do not recreate the obsolete
seven-sheet workbook importer or the V1 `manifest.json` format.

The imported curriculum is an **outline**, not published authored learning material.
Generate and verify lessons individually with Pedagogy V3 and its receipt-based gates.
