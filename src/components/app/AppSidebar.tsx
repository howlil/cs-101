"use client";
import { useEffect, useRef, useState } from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '../arc/button/button';
import { Dialog, DialogContent, DialogTrigger } from '../arc/dialog/dialog';
import { Tooltip } from '../arc/tooltip/tooltip';
import CurriculumExplorer, { type ExplorerItem, type ModuleOption, type TrackOption } from '../curriculum/CurriculumExplorer';

export type SidebarData = {
  total: number;
  activeTrackId: string;
  selectedModuleId?: string;
  tracks: TrackOption[];
  modules: ModuleOption[];
  integrations: ExplorerItem[];
};
const COLLAPSE_KEY = 'cs101:sidebar-collapsed';
function SidebarContent({ data }: { data: SidebarData }) {
  return <div className="sidebar-scroll">
    <div className="sidebar-curriculum">
      <div className="sidebar-section-heading"><span>DAFTAR KURIKULUM</span><span>{data.total} item</span></div>
      <CurriculumExplorer activeTrackId={data.activeTrackId} selectedModuleId={data.selectedModuleId}
        tracks={data.tracks} modules={data.modules} integrations={data.integrations} />
    </div>
  </div>;
}

export default function AppSidebar({ data }: { data: SidebarData }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo(0, 0); }, [data.activeTrackId]);
  const toggleDesktop = () => {
    const next = document.documentElement.dataset.sidebar === 'collapsed' ? 'expanded' : 'collapsed';
    document.documentElement.dataset.sidebar = next;
    try { localStorage.setItem(COLLAPSE_KEY, next === 'collapsed' ? 'true' : 'false'); } catch {}
  };
  return <>
    <aside className="app-sidebar" aria-label="Daftar kurikulum">
      <div className="sidebar-identity">
        <a className="sidebar-brand" href="/" aria-label="CS-101 · Materi">
          <span className="sidebar-brand-mark" aria-hidden="true">CS</span>
          <span className="sidebar-brand-label">CS-101</span>
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
      <div ref={scrollRef} className="sidebar-frame"><SidebarContent data={data} /></div>
    </aside>
    <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="sidebar-mobile-trigger" aria-label="Buka daftar kurikulum">
          <Menu size={18} strokeWidth={1.8} />
        </Button>
      </DialogTrigger>
      <DialogContent title="Kurikulum CS-101" description="Pilih domain dan topik" className="sidebar-mobile-dialog">
        <SidebarContent data={data} />
      </DialogContent>
    </Dialog>
  </>;
}
