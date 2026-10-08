"use client";

import { BarChart3, BookOpen, Home } from 'lucide-react';
import CurriculumSearch from '../search/CurriculumSearch';
import ThemePreference from '../ui/ThemePreference';
import { Tooltip } from '../arc/tooltip/tooltip';
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

// Rendered by Astro on each route so aria-current stays correct after swaps,
// without rehydrating an entire app shell around the new page's children.
export function AppNavigation({ currentPath }: { currentPath: string }) {
  const materialActive =
    currentPath === '/curriculum' ||
    currentPath.startsWith('/learn/') ||
    currentPath.startsWith('/project/') ||
    currentPath.startsWith('/integration/') ||
    currentPath === '/demo';

  return <aside className="global-rail" aria-label="Navigasi utama">
    <nav className="global-nav">
      <Tooltip content="Hari ini">
        <a className="rail-link" href="/" aria-label="Hari ini"
          aria-current={currentPath === '/' ? 'page' : undefined}>
          <Home size={18} strokeWidth={1.8} aria-hidden="true" />
        </a>
      </Tooltip>
      <Tooltip content="Kurikulum">
        <a className="rail-link" href="/curriculum" aria-label="Kurikulum"
          aria-current={materialActive ? 'page' : undefined}>
          <BookOpen size={18} strokeWidth={1.8} aria-hidden="true" />
        </a>
      </Tooltip>
      <Tooltip content="Progres">
        <a className="rail-link" href="/progress" aria-label="Progres"
          aria-current={currentPath === '/progress' ? 'page' : undefined}>
          <BarChart3 size={18} strokeWidth={1.8} aria-hidden="true" />
        </a>
      </Tooltip>
    </nav>
  </aside>;
}
