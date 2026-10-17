"use client";

import { navigate } from 'astro:transitions/client';
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
  return <a className="item-row" href={item.href} aria-current={item.active ? 'page' : undefined}>
    <span className="item-title">{item.title}</span>
    <span className="item-id">{item.id}</span>
  </a>;
}

export default function CurriculumExplorer({ tracks, activeTrackId, modules, integrations, selectedModuleId }: {
  tracks: TrackOption[];
  activeTrackId: string;
  modules: ModuleOption[];
  integrations: ExplorerItem[];
  selectedModuleId?: string;
}) {
  const activeIntegration = integrations.some((item) => item.active);
  const selectedModuleIndex = modules.findIndex((module) => module.id === selectedModuleId);
  const defaultOpen = activeIntegration ? modules.length : Math.max(0, selectedModuleIndex);
  const items = modules.map((module) => ({
    title: module.title,
    content: <nav aria-label={module.title} className="module-items">
      {module.items.map((item) => <ItemRow key={item.id} item={item} />)}
    </nav>,
  }));

  // Cross-domain integrations are available on demand, not a permanently exposed second tree.
  if (integrations.length > 0) {
    items.push({
      title: 'Integrasi lintas domain',
      content: <nav aria-label="Integrasi lintas domain" className="module-items">
        {integrations.map((item) => <ItemRow key={item.id} item={item} />)}
      </nav>,
    });
  }

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
      <p className="curriculum-tree-heading">Materi</p>
      <Accordion key={activeTrackId + ':' + (selectedModuleId ?? (activeIntegration ? 'integration' : ''))}
        size="sm" defaultOpen={defaultOpen} items={items} />
    </div>
  </div>;
}
