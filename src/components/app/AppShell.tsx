"use client";

import CurriculumSearch from '../search/CurriculumSearch';
import ThemePreference from '../ui/ThemePreference';
import type { CurriculumSearchEntry } from '../../domain/curriculum-v2/selectors';

type SearchEntry = CurriculumSearchEntry & { href: string };

// Only stable header controls are hydrated. The Astro header element persists. Route content must remain
// outside this island so ClientRouter can replace it on every navigation.
export function AppHeaderActions({ searchEntries }: { searchEntries: SearchEntry[] }) {
  return <div className="header-actions">
    <CurriculumSearch entries={searchEntries} />
    <ThemePreference />
  </div>;
}

