"use client";

import { useEffect, useRef } from 'react';
import CurriculumExplorer, { type ExplorerItem } from './CurriculumExplorer';

const EXPLORER_SCROLL_KEY = 'cs101:curriculum-explorer-scroll';

export type ContextualCurriculumData = {
  total: number;
  activeTrackId: string;
  selectedModuleId?: string;
  tracks: Array<{ id: string; title: string; total: number }>;
  modules: Array<{ id: string; title: string; items: ExplorerItem[] }>;
  integrations: ExplorerItem[];
  searchEntries: Array<ExplorerItem & { searchText: string }>;
};

export default function ContextualCurriculumSidebar({
  data,
}: {
  data: ContextualCurriculumData;
}) {
  const explorerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = explorerRef.current;
    if (!node) return;
    try {
      const saved = Number(sessionStorage.getItem(EXPLORER_SCROLL_KEY) ?? 0);
      if (Number.isFinite(saved)) node.scrollTop = saved;
    } catch {}
  }, []);

  return <aside
    ref={explorerRef}
    className="curriculum-explorer contextual-curriculum-rail"
    aria-label="Kurikulum"
    onScroll={(event) => {
      try {
        sessionStorage.setItem(EXPLORER_SCROLL_KEY, String(event.currentTarget.scrollTop));
      } catch {}
    }}
  >
    <div className="explorer-heading">
      <a className="contextual-curriculum-title" href="/curriculum">Kurikulum</a>
      <span className="explorer-count">{data.total}</span>
    </div>

    <CurriculumExplorer
      activeTrackId={data.activeTrackId}
      selectedModuleId={data.selectedModuleId}
      tracks={data.tracks}
      modules={data.modules}
      integrations={data.integrations}
      searchEntries={data.searchEntries}
    />
  </aside>;
}
