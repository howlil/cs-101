# Curriculum Contract

Curriculum Manifest V2 is the learning specification. Generated content may explain it, but must not redefine it.

## Canonical identity

Use **Item ID** as stable identity everywhere.

Examples:

- `JAV-001` — unit
- `SQL-P01` — checkpoint
- `INT-001` — integration

Historical code may still expose `taskId` as a compatibility field, but generation targets use Item ID.

## Canonical source fields

Manifest V2 normalizes source workbook data into explicit item types.

A unit contains:

- Item ID;
- track + module;
- title;
- market expectation;
- scope;
- Definition of Done criteria;
- challenge;
- direct prerequisites;
- curriculum source;
- estimated minutes;
- typed cross-module relations;
- fingerprint.

Checkpoint and integration have their own schemas. They are not converted into ordinary unit lessons.

## Precedence

When information conflicts:

1. active Item ID + current Manifest V2 item;
2. explicit criteria / project requirements;
3. scope;
4. challenge/problem statement;
5. typed curriculum relations;
6. generated lesson/spec.

Generated content never overrides levels 1–5.

## Graph context rule

For one unit, use the deterministic packet produced by:

```sh
pnpm generation:prepare <ITEM-ID>
```

The packet contains only:

`target + direct prerequisites + local module neighborhood + nearest checkpoint/lineage + bounded contextual relations + curriculum source`

Do not load the full manifest into the model for a one-unit generation request.

Contextual relations such as `related`, `deep_dive`, `foundation`, and `contributes_to` do not become hard prerequisites.

## Artifact rule

Unit generation produces three final artifacts:

- lesson MDX;
- generation provenance record;
- review bank.

Checkpoint and integration stay in their dedicated runtime workflows.

Generated artifacts are derived/cache-like outputs. Manifest V2 remains source of truth.

## Staleness

All generation artifacts bind to the active item fingerprint.

If the curriculum item changes:

- the existing lesson is stale;
- generation metadata is stale;
- review bank is stale;
- historical learner evidence remains historical;
- regenerate that unit on demand.

Do not silently rewrite historical IDs or evidence.
