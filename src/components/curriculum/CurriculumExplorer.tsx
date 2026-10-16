"use client";

import { navigate } from 'astro:transitions/client';
import { BookOpen, Boxes, FolderKanban } from 'lucide-react';
import { Select } from '../arc/select/select';
import { Accordion } from '../arc/accordion/accordion';

export type ExplorerItem = {
  id: string;
  title: string;
  href: string;
  kind: 'unit' | 'checkpoint' | 'integration';
  active: boolean;
};
export type TrackOption = { id: string; title: string; total: number };
export type ModuleOption = { id: string; title: string; items: ExplorerItem[] };

function ItemRow({ item }: { item: ExplorerItem }) {
  const Icon = item.kind === 'checkpoint' ? FolderKanban : item.kind === 'integration' ? Boxes : BookOpen;
  return <a className="item-row" href={item.href} aria-current={item.active ? 'page' : undefined}>
    <span className="item-marker" aria-hidden="true"><Icon size={13} strokeWidth={1.8} /></span>
    <span className="item-copy">
      <span className="item-id">{item.id}</span>
      <span className="item-title">{item.title}</span>
    </span>
  </a>;
}

export default function CurriculumExplorer({ tracks, activeTrackId, modules, integrations, selectedModuleId }: {
  tracks: TrackOption[];
  activeTrackId: string;
  modules: ModuleOption[];
  integrations: ExplorerItem[];
  selectedModuleId?: string;
}) {
  const count = modules.reduce((total, module) => total + module.items.length, 0);
  const defaultOpen = Math.max(0, modules.findIndex((module) => module.id === selectedModuleId));

  return <div className="curriculum-controls">
    <div className="track-select-uiarc">
      <Select label="DOMAIN" value={activeTrackId}
        options={tracks.map((track) => ({ value: track.id, label: track.title }))}
        onValueChange={(next) => {
          if (next !== activeTrackId) navigate('/?track=' + encodeURIComponent(next));
        }}
      />
    </div>

    <div className="module-tree module-tree--uiarc">
      <div className="curriculum-tree-heading">
        <span>KURIKULUM</span><span>{count} ITEMS</span>
      </div>
      <Accordion key={activeTrackId + ':' + (selectedModuleId ?? '')} size="sm" defaultOpen={defaultOpen}
        items={modules.map((module) => ({
          title: module.title,
          meta: module.items.length,
          content: <nav aria-label={module.title} className="module-items">
            {module.items.map((item) => <ItemRow key={item.id} item={item} />)}
          </nav>,
        }))} />
    </div>

    {integrations.length > 0 && <div className="integration-list">
      <p className="explorer-label"><Boxes size={12} aria-hidden="true" /> INTEGRASI</p>
      {integrations.map((item) => <ItemRow key={item.id} item={item} />)}
    </div>}
  </div>;
}
