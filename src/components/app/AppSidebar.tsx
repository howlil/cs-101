"use client";

import { useEffect, useState } from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '../arc/button/button';
import { Dialog, DialogContent, DialogTrigger } from '../arc/dialog/dialog';
import { Tooltip } from '../arc/tooltip/tooltip';
import CurriculumExplorer, { type ExplorerItem, type ModuleOption, type TrackOption } from '../curriculum/CurriculumExplorer';

export type SidebarData = {
  activeTrackId: string;
  selectedModuleId?: string;
  tracks: TrackOption[];
  modules: ModuleOption[];
  integrations: ExplorerItem[];
};

const COLLAPSE_KEY = 'cs101:sidebar-collapsed';

function SidebarContent({ data }: { data: SidebarData }) {
  return <div className="sidebar-scroll">
    <CurriculumExplorer
      activeTrackId={data.activeTrackId}
      selectedModuleId={data.selectedModuleId}
      tracks={data.tracks}
      modules={data.modules}
      integrations={data.integrations}
    />
  </div>;
}

export default function AppSidebar({ data }: { data: SidebarData }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // A selected domain or topic should never leave the mobile drawer covering the article.
  useEffect(() => { setMobileOpen(false); }, [data.activeTrackId, data.selectedModuleId]);

  const toggleDesktop = () => {
    const next = document.documentElement.dataset.sidebar === 'collapsed' ? 'expanded' : 'collapsed';
    document.documentElement.dataset.sidebar = next;
    try { localStorage.setItem(COLLAPSE_KEY, next === 'collapsed' ? 'true' : 'false'); } catch {}
  };

  return <>
    <aside className="app-sidebar" aria-label="Daftar kurikulum">
      <div className="sidebar-identity">
        <a className="sidebar-brand" href="/" aria-label="CS-101 · Content Library">
          <span className="sidebar-brand-mark" aria-hidden="true">CS</span>
          <span className="sidebar-brand-copy">
            <span className="sidebar-brand-label">CS-101</span>
          </span>
        </a>
        <Tooltip content="Ciutkan atau buka sidebar">
          <Button type="button" variant="ghost" size="sm" className="sidebar-collapse" onClick={toggleDesktop} aria-label="Ciutkan sidebar">
            <PanelLeftClose size={17} strokeWidth={1.8} />
          </Button>
        </Tooltip>
        <Tooltip content="Buka sidebar">
          <Button type="button" variant="ghost" size="sm" className="sidebar-expand" onClick={toggleDesktop} aria-label="Buka sidebar">
            <PanelLeftOpen size={17} strokeWidth={1.8} />
          </Button>
        </Tooltip>
      </div>
      <div className="sidebar-frame"><SidebarContent data={data} /></div>
    </aside>
    <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="sidebar-mobile-trigger" aria-label="Buka daftar kurikulum">
          <Menu size={18} strokeWidth={1.8} />
        </Button>
      </DialogTrigger>
      <DialogContent title="Kurikulum CS-101" description="Pilih domain dan materi" className="sidebar-mobile-dialog">
        <SidebarContent data={data} />
      </DialogContent>
    </Dialog>
  </>;
}
