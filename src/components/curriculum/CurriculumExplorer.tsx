import { navigate } from 'astro:transitions/client';
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
import { matchesQuery } from '../arc/lib/matches-query';

type ItemKind = 'unit' | 'checkpoint' | 'integration';
type DisplayState = 'passed' | 'stale' | 'active' | 'started' | 'locked' | 'ready' | 'unknown';

type TrackOption = { id: string; title: string; total: number; completed: number };
export type ExplorerItem = {
  id: string;
  title: string;
  href: string;
  kind: ItemKind;
  state: DisplayState;
  active: boolean;
  position?: { index: number; total: number };
};

type ModuleOption = { id: string; title: string; completed: number; items: ExplorerItem[] };
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

function ItemRow({ item, search = false, currentPath }: { item: ExplorerItem; search?: boolean; currentPath: string }) {
  const isCurrentPage = item.active && (currentPath === '/curriculum' || item.href === currentPath);
  return <a
    className={search ? 'search-row' : 'item-row'}
    href={item.href}
    aria-current={isCurrentPage ? 'page' : undefined}
    data-selected={item.active ? 'true' : undefined}
  >
    <span className="item-marker" aria-hidden="true"><ItemIcon item={item} /></span>
    <span className="item-copy">
      <span className="item-id">{item.id}{item.active && item.position ? ` · ${item.position.index} dari ${item.position.total}` : ''}</span>
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
  currentPath,
}: {
  currentPath: string;
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
      ? searchEntries.filter((entry) => matchesQuery(entry.searchText, normalizedQuery)).slice(0, 16)
      : [],
    [normalizedQuery, searchEntries],
  );

  const defaultOpen = Math.max(0, modules.findIndex((module) => module.id === selectedModuleId));
  const accordionItems = modules.map((module) => ({
    title: module.title + ' · ' + module.completed + '/' + module.items.length,
    content: (
      <nav aria-label={module.title} className="module-items">
        {module.items.map((item) => <ItemRow key={item.id} item={item} currentPath={currentPath} />)}
      </nav>
    ),
  }));

  return <div className="curriculum-controls">
    <div className="curriculum-search-uiarc">
      <Input
        label="Cari kurikulum"
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
          ? results.map((entry) => <ItemRow key={entry.id} item={entry} search currentPath={currentPath} />)
          : <p className="search-empty">Tidak ada materi yang cocok.</p>}
      </div>
    ) : <>
      <div className="track-select-uiarc">
        <Select
          label="JALUR"
          value={activeTrackId}
          options={tracks.map((track) => ({
            value: track.id,
            label: track.title + ' · ' + track.completed + '/' + track.total,
          }))}
          onValueChange={(next) => {
            if (next !== activeTrackId) {
              try { sessionStorage.removeItem('cs101:curriculum-explorer-scroll'); } catch {}
              navigate('/curriculum?track=' + encodeURIComponent(next));
            }
          }}
        />
      </div>

      {accordionItems.length > 0 && (
        <div className="module-tree module-tree--uiarc">
          <p className="explorer-label"><FolderKanban size={12} strokeWidth={1.8} aria-hidden="true" /> MODUL</p>
          <Accordion key={activeTrackId + ':' + (selectedModuleId || '')} items={accordionItems} defaultOpen={defaultOpen} size="sm" />
        </div>
      )}

      {integrations.length > 0 && (
        <div className="integration-list">
          <p className="explorer-label"><Boxes size={12} strokeWidth={1.8} aria-hidden="true" /> LATIHAN GABUNGAN</p>
          {integrations.map((item) => <ItemRow key={item.id} item={item} currentPath={currentPath} />)}
        </div>
      )}
    </>}
  </div>;
}
