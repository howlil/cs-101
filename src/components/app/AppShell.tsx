"use client";

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BarChart3, BookOpen, Home } from 'lucide-react';
import CurriculumSearch from '../search/CurriculumSearch';
import ContextualCurriculumSidebar, { type ContextualCurriculumData } from '../curriculum/ContextualCurriculumSidebar';
import ThemePreference from '../ui/ThemePreference';
import { Tooltip } from '../arc/tooltip/tooltip';
import type { CurriculumSearchEntry } from '../../domain/curriculum-v2/selectors';

type SearchEntry = CurriculumSearchEntry & { href: string };

export default function AppShell({
  currentPath,
  navigationKey,
  flush = false,
  searchEntries,
  contextualExplorer,
  children,
}: {
  currentPath: string;
  navigationKey: string;
  flush?: boolean;
  searchEntries: SearchEntry[];
  contextualExplorer?: ContextualCurriculumData;
  children: ReactNode;
}) {
  const reduce = useReducedMotion() ?? false;
  const materialActive =
    currentPath === '/curriculum' ||
    currentPath.startsWith('/learn/') ||
    currentPath.startsWith('/project/') ||
    currentPath.startsWith('/integration/') ||
    currentPath === '/demo';

  return <>
    <a className="skip-link" href="#main">Langsung ke isi</a>

    <header className="topbar">
      <a className="brand" href="/" aria-label="CS-101 · Hari ini">
        <span className="brand-mark" aria-hidden="true">CS</span>
        <span>CS-101</span>
      </a>

      <div className="header-actions">
        <CurriculumSearch entries={searchEntries} />
        <ThemePreference />
      </div>
    </header>

    <div className={['app-shell', contextualExplorer ? 'app-shell--with-context' : ''].filter(Boolean).join(' ')}>
      <aside className="global-rail" aria-label="Navigasi utama">
        <nav className="global-nav">
          <Tooltip content="Hari ini">
            <a
              className="rail-link"
              href="/"
              aria-label="Hari ini"
              aria-current={currentPath === '/' ? 'page' : undefined}
            >
              <Home size={18} strokeWidth={1.8} aria-hidden="true" />
            </a>
          </Tooltip>
          <Tooltip content="Kurikulum">
            <a
              className="rail-link"
              href="/curriculum"
              aria-label="Kurikulum"
              aria-current={materialActive ? 'page' : undefined}
            >
              <BookOpen size={18} strokeWidth={1.8} aria-hidden="true" />
            </a>
          </Tooltip>
          <Tooltip content="Progres">
            <a
              className="rail-link"
              href="/progress"
              aria-label="Progres"
              aria-current={currentPath === '/progress' ? 'page' : undefined}
            >
              <BarChart3 size={18} strokeWidth={1.8} aria-hidden="true" />
            </a>
          </Tooltip>
        </nav>
      </aside>

      {contextualExplorer && <ContextualCurriculumSidebar data={contextualExplorer} />}

      <motion.main
        id="main"
        tabIndex={-1}
        className={['app-main', flush ? 'app-main--flush' : ''].filter(Boolean).join(' ')}
        key={navigationKey}
        initial={reduce ? false : { opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? { duration: 0 } : { duration: .14, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.main>
    </div>
  </>;
}
