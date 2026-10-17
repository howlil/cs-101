# Curriculum source

The active `manifest.v2.json` is deliberately empty (0 tracks, modules, items and relations). Previously imported datasets and lesson content were removed from this feature branch. The source workbook remains unchanged.

To start over, run `pnpm import:curriculum -- /path/to/kurikulum.xlsx --dry-run` and review added/removed/changed IDs. Only then import, validate the curriculum and run CI. Import curriculum structure only, not personal learner progress or session data.
