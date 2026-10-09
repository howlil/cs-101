"use client";

import { useEffect, useRef, useState, type RefObject } from 'react';
import { BarChart3, BookOpen, Home, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '../arc/button/button';
import { Dialog, DialogContent, DialogTrigger } from '../arc/dialog/dialog';
import { Tooltip } from '../arc/tooltip/tooltip';
import CurriculumExplorer, { type ExplorerItem } from '../curriculum/CurriculumExplorer';

const SCROLL_PREFIX = 'cs101:sidebar-scroll:';
const COLLAPSE_KEY = 'cs101:sidebar-collapsed';

export type SidebarData = {
  total: number;
  curriculumHref: string;
  activeTrackId: string;
  selectedModuleId?: string;
  tracks: Array<{ id: string; title: string; total: number; completed: number }>;
  modules: Array<{ id: string; title: string; completed: number; items: ExplorerItem[] }>;
  integrations: ExplorerItem[];
  searchEntries: Array<ExplorerItem & { searchText: string }>;
};

const destinations = [
  { href: '/', label: 'Hari ini', Icon: Home },
  { href: '/curriculum', label: 'Kurikulum', Icon: BookOpen },
  { href: '/progress', label: 'Progres', Icon: BarChart3 },
];

function Navigation({ currentPath, curriculumHref = '/curriculum', compact = false }: { currentPath: string; curriculumHref?: string; compact?: boolean }) {
  const current = currentPath === '/' ? '/'
    : currentPath === '/progress' || currentPath.startsWith('/review/') ? '/progress'
      : '/curriculum';
  return <nav className="sidebar-global-nav" aria-label="Navigasi utama">
    {destinations.map(({ href, label, Icon }) => {
      const link = <a
        key={href}
        className="sidebar-nav-link"
        href={href === '/curriculum' ? curriculumHref : href}
        title={compact ? label : undefined}
        aria-label={label}
        aria-current={current === href ? 'page' : undefined}
      ><Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span className="sidebar-link-copy">{label}</span></a>;
      return compact ? <Tooltip key={href} content={label}>{link}</Tooltip> : link;
    })}
  </nav>;
}

function SidebarSections({ currentPath, data, compact = false, scrollRef, scrollKey }: {
  currentPath: string;
  data?: SidebarData;
  compact?: boolean;
  scrollRef?: RefObject<HTMLDivElement | null>;
  scrollKey?: string;
}) {
  return <div className="sidebar-scroll" ref={scrollRef} onScroll={scrollKey ? (event) => {
    try { sessionStorage.setItem(scrollKey, String(event.currentTarget.scrollTop)); } catch {}
  } : undefined}>
    <Navigation currentPath={currentPath} curriculumHref={data?.curriculumHref} compact={compact} />
    {data && <div className="sidebar-curriculum">
      <div className="sidebar-section-heading">
        <a href={data.curriculumHref}>Kurikulum</a><span>{data.total} item</span>
      </div>
      <CurriculumExplorer
        currentPath={currentPath}
        activeTrackId={data.activeTrackId}
        selectedModuleId={data.selectedModuleId}
        tracks={data.tracks}
        modules={data.modules}
        integrations={data.integrations}
        searchEntries={data.searchEntries}
      />
    </div>}
    {!data && <a className="sidebar-open-curriculum" href="/curriculum">Jelajahi kurikulum</a>}
  </div>;
}

export default function AppSidebar({ currentPath, data }: { currentPath: string; data?: SidebarData }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const key = SCROLL_PREFIX + (data?.activeTrackId || 'global');
    const node = scrollRef.current;
    if (!node) return;
    try {
      const saved = Number(sessionStorage.getItem(key) || '0');
      if (Number.isFinite(saved)) node.scrollTop = saved;
    } catch {}
  }, [data?.activeTrackId]);

  const toggleDesktop = () => {
    const next = document.documentElement.dataset.sidebar === 'collapsed' ? 'expanded' : 'collapsed';
    document.documentElement.dataset.sidebar = next;
    try { localStorage.setItem(COLLAPSE_KEY, next === 'collapsed' ? 'true' : 'false'); } catch {}
  };

  return <>
    <aside className="app-sidebar" aria-label="Sidebar utama">
      <div className="sidebar-identity">
        <a className="sidebar-brand" href="/" aria-label="CS-101 · Hari ini">
          <span className="sidebar-brand-mark" aria-hidden="true">CS</span>
          <span className="sidebar-brand-label">CS-101</span>
        </a>
        <Tooltip content="Ciutkan atau buka sidebar">
          <Button type="button" variant="ghost" size="sm" className="sidebar-collapse" onClick={toggleDesktop} aria-label="Ciutkan atau buka sidebar">
            <PanelLeftClose size={17} strokeWidth={1.8} aria-hidden="true" />
          </Button>
        </Tooltip>
        <Tooltip content="Buka sidebar">
          <Button type="button" variant="ghost" size="sm" className="sidebar-expand" onClick={toggleDesktop} aria-label="Buka sidebar">
            <PanelLeftOpen size={17} strokeWidth={1.8} aria-hidden="true" />
          </Button>
        </Tooltip>
      </div>
      <SidebarSections
        currentPath={currentPath}
        data={data}
        scrollRef={scrollRef}
        scrollKey={SCROLL_PREFIX + (data?.activeTrackId || 'global')}
        compact
      />
    </aside>
    <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="ghost" className="sidebar-mobile-trigger" aria-label="Buka navigasi">
          <Menu size={18} strokeWidth={1.8} aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent title="CS-101" description="Navigasi dan kurikulum" className="sidebar-mobile-dialog">
        <SidebarSections currentPath={currentPath} data={data} />
      </DialogContent>
    </Dialog>
  </>;
}
