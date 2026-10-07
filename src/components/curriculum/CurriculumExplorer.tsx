import { useMemo, useState } from 'react';
import {
  Boxes,
  Check,
  Circle,
  CircleDot,
  Clock3,
  FolderKanban,
  LockKeyhole,
  Search,
  TriangleAlert,
} from 'lucide-react';
import { Input } from '../arc/input/input';
import { Select } from '../arc/select/select';
import { Accordion } from '../arc/accordion/accordion';

type ItemKind = 'unit' | 'checkpoint' | 'integration';
type DisplayState = 'passed' | 'stale' | 'active' | 'started' | 'locked' | 'ready' | 'unknown';

type TrackOption = { id: string; title: string; total: number };
export type ExplorerItem = {
  id: string;
  title: string;
  href: string;
  kind: ItemKind;
  state: DisplayState;
  active: boolean;
};

type ModuleOption = { id: string; title: string; items: ExplorerItem[] };
type SearchEntry = ExplorerItem & { searchText: string };

function ItemIcon({ item }: { item: ExplorerItem }) {
  const props = { size: 14, strokeWidth: 1.8, 'aria-hidden': true as const };
  if (item.state === 'passed') return <Check {...props} />;
  if (item.state === 'active') return <CircleDot {...props} />;
  if (item.state === 'started') return <Clock3 {...props} />;
  if (item.state === 'stale') return <TriangleAlert {...props} />;
  if (item.state === 'locked') return <LockKeyhole {...props} />;
  if (item.kind === 'checkpoint') return <FolderKanban {...props} />;
  if (item.kind === 'integration') return <Boxes {...props} />;
  return <Circle {...props} />;
}

function ItemRow({ item, search = false }: { item: ExplorerItem; search?: boolean }) {
  return <a
    className={search ? 'search-row' : 'item-row'}
    href={item.href}
    aria-current={item.active ? 'page' : undefined}
  >
    <span className="item-marker" aria-hidden="true"><ItemIcon item={item} /></span>
    <span className="item-copy">
      <span className="item-id">{item.id}</span>
      <span className="item-title">{item.title}</span>
    </span>
  </a>;
}

export default function CurriculumExplorer({
  tracks,
  activeTrackId,
  modules,
  integrations,
  searchEntries,
  selectedModuleId,
}: {
  tracks: TrackOption[];
  activeTrackId: string;
  modules: ModuleOption[];
  integrations: ExplorerItem[];
  searchEntries: SearchEntry[];
  selectedModuleId?: string;
}) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');
  const results = useMemo(
    () => normalizedQuery
      ? searchEntries.filter((entry) => entry.searchText.includes(normalizedQuery)).slice(0, 16)
      : [],
    [normalizedQuery, searchEntries],
  );

  const defaultOpen = Math.max(0, modules.findIndex((module) => module.id === selectedModuleId));
  const accordionItems = modules.map((module) => ({
    title: module.title + ' · ' + module.items.length,
    content: (
      <nav aria-label={module.title} className="module-items">
        {module.items.map((item) => <ItemRow key={item.id} item={item} />)}
      </nav>
    ),
  }));

  return <div className="curriculum-controls">
    <div className="curriculum-search-uiarc">
      <Input
        label="Cari curriculum"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setQuery('');
            event.currentTarget.blur();
          }
        }}
        placeholder="Cari ID atau topik…"
        autoComplete="off"
        spellCheck={false}
      />
    </div>

    {normalizedQuery ? (
      <div className="search-results" aria-live="polite">
        <p className="explorer-label"><Search size={12} strokeWidth={1.8} aria-hidden="true" /> HASIL</p>
        {results.length
          ? results.map((entry) => <ItemRow key={entry.id} item={entry} search />)
          : <p className="search-empty">Tidak ada materi yang cocok.</p>}
      </div>
    ) : <>
      <div className="track-select-uiarc">
        <Select
          label="TRACK"
          value={activeTrackId}
          options={tracks.map((track) => ({
            value: track.id,
            label: track.title + ' · ' + track.total,
          }))}
          onValueChange={(next) => {
            if (next !== activeTrackId) {
              window.location.assign('/curriculum?track=' + encodeURIComponent(next));
            }
          }}
        />
      </div>

      {accordionItems.length > 0 && (
        <div className="module-tree module-tree--uiarc">
          <p className="explorer-label"><FolderKanban size={12} strokeWidth={1.8} aria-hidden="true" /> MODULE</p>
          <Accordion items={accordionItems} defaultOpen={defaultOpen} />
        </div>
      )}

      {integrations.length > 0 && (
        <div className="integration-list">
          <p className="explorer-label"><Boxes size={12} strokeWidth={1.8} aria-hidden="true" /> INTEGRATION</p>
          {integrations.map((item) => <ItemRow key={item.id} item={item} />)}
        </div>
      )}
    </>}
  </div>;
}
