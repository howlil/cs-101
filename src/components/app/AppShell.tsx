"use client";

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BarChart3, BookOpen, Heart, Home, Star } from 'lucide-react';
import CurriculumSearch from '../search/CurriculumSearch';
import ThemePreference from '../arc/ThemePreference';
import type { CurriculumSearchEntry } from '../../domain/curriculum-v2/selectors';

type SearchEntry = CurriculumSearchEntry & { href: string };

export default function AppShell({
  currentPath,
  flush = false,
  searchEntries,
  children,
}: {
  currentPath: string;
  flush?: boolean;
  searchEntries: SearchEntry[];
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
        <span>
          CS-101
          <span className="brand-sub">Catatan belajar</span>
        </span>
      </a>

      <div className="header-actions">
        <CurriculumSearch entries={searchEntries} />
        <a
          className="top-action"
          href="https://github.com/howlil/cs-101"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Star CS-101 di GitHub"
          title="Star repository"
        >
          <Star size={15} strokeWidth={1.8} aria-hidden="true" />
        </a>
        <a
          className="top-action"
          href="https://github.com/sponsors/howlil"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Donasi lewat GitHub Sponsors"
          title="Donate"
        >
          <Heart size={15} strokeWidth={1.8} aria-hidden="true" />
        </a>
        <ThemePreference />
      </div>
    </header>

    <div className="app-shell">
      <aside className="global-rail" aria-label="Navigasi utama">
        <nav className="global-nav">
          <a
            className="rail-link"
            href="/"
            aria-current={currentPath === '/' ? 'page' : undefined}
            data-label="Hari ini"
          >
            <Home size={19} strokeWidth={1.8} aria-hidden="true" />
            <span className="sr-only">Hari ini</span>
          </a>
          <a
            className="rail-link"
            href="/curriculum"
            aria-current={materialActive ? 'page' : undefined}
            data-label="Materi"
          >
            <BookOpen size={19} strokeWidth={1.8} aria-hidden="true" />
            <span className="sr-only">Materi</span>
          </a>
          <a
            className="rail-link"
            href="/progress"
            aria-current={currentPath === '/progress' ? 'page' : undefined}
            data-label="Progres"
          >
            <BarChart3 size={19} strokeWidth={1.8} aria-hidden="true" />
            <span className="sr-only">Progres</span>
          </a>
        </nav>
      </aside>

      <motion.main
        id="main"
        tabIndex={-1}
        className={['app-main', flush ? 'app-main--flush' : ''].filter(Boolean).join(' ')}
        key={currentPath}
        initial={reduce ? false : { opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? { duration: 0 } : { duration: .18, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.main>
    </div>
  </>;
}
