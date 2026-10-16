"use client";

import { navigate } from 'astro:transitions/client';
import { useMemo, useState } from 'react';
import { BookOpen, Boxes, FolderKanban, Search } from 'lucide-react';
import { Input } from '../arc/input/input';
import { Button } from '../arc/button/button';
import { Select } from '../arc/select/select';
import { Accordion } from '../arc/accordion/accordion';
import { matchesQuery } from '../arc/lib/matches-query';

export type ExplorerItem = {
  id: string;
  title: string;
  href: string;
  kind: 'unit' | 'checkpoint' | 'integration';
  active: boolean;
};
export type TrackOption = { id: string; title: string; total: number };
export type ModuleOption = { id: string; title: string; items: ExplorerItem[] };
export type SearchEntry = ExplorerItem & { searchText: string };

function ItemRow({ item }: { item: ExplorerItem }) {
  const Icon = item.kind === 'checkpoint' ? FolderKanban : item.kind === 'integration' ? Boxes : BookOpen;
  return <a className="item-row" href={item.href} aria-current={item.active ? 'page' : undefined}>
    <span className="item-marker" aria-hidden="true"><Icon size={14} strokeWidth={1.8} /></span>
    <span className="item-copy"><span className="item-id">{item.id}</span><span className="item-title">{item.title}</span></span>
  </a>;
}

export default function CurriculumExplorer({ tracks, activeTrackId, modules, integrations, searchEntries, selectedModuleId }: {
  tracks: TrackOption[];
  activeTrackId: string;
  modules: ModuleOption[];
  integrations: ExplorerItem[];
  searchEntries: SearchEntry[];
  selectedModuleId?: string;
}) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(16);
  const needle = query.trim().toLocaleLowerCase('id-ID');
  const matched = useMemo(() => needle
    ? searchEntries.filter((entry) => matchesQuery(entry.searchText, needle))
    : [], [needle, searchEntries]);
  const defaultOpen = Math.max(0, modules.findIndex((module) => module.id === selectedModuleId));
  return <div className="curriculum-controls">
    <div className="track-select-uiarc">
      <Select label="DOMAIN" value={activeTrackId}
        options={tracks.map((track) => ({ value: track.id, label: track.title }))}
        onValueChange={(next) => { if (next !== activeTrackId) navigate('/?track=' + encodeURIComponent(next)); }}
      />
    </div>
    <div className="curriculum-search-uiarc">
      <Input label="Cari materi" type="search" value={query}
        onChange={(event) => { setQuery(event.currentTarget.value); setLimit(16); }}
        onKeyDown={(event) => { if (event.key === 'Escape') { setQuery(''); setLimit(16); } }}
        placeholder="Cari ID atau topik…" autoComplete="off" spellCheck={false} />
    </div>
    {needle ? <div className="search-results" aria-live="polite">
      <p className="explorer-label"><Search size={12} aria-hidden="true" /> HASIL · {Math.min(limit, matched.length)}/{matched.length}</p>
      {matched.slice(0, limit).map((item) => <ItemRow key={item.id} item={item} />)}
      {!matched.length && <p className="search-empty">Tidak ada materi yang cocok.</p>}
      {matched.length > limit && <Button type="button" variant="ghost" size="sm" onClick={() => setLimit(limit + 16)}>Tampilkan lebih banyak</Button>}
    </div> : <>
      <div className="module-tree module-tree--uiarc">
        <p className="explorer-label"><FolderKanban size={12} aria-hidden="true" /> MODUL</p>
        <Accordion key={activeTrackId + ':' + (selectedModuleId ?? '')} size="sm" defaultOpen={defaultOpen}
          items={modules.map((module) => ({
            title: module.title + ' · ' + module.items.length,
            content: <nav aria-label={module.title} className="module-items">
              {module.items.map((item) => <ItemRow key={item.id} item={item} />)}
            </nav>,
          }))} />
      </div>
      {integrations.length > 0 && <div className="integration-list">
        <p className="explorer-label"><Boxes size={12} aria-hidden="true" /> INTEGRASI</p>
        {integrations.map((item) => <ItemRow key={item.id} item={item} />)}
      </div>}
    </>}
  </div>;
}
