import { useMemo, useState } from 'react';
import { Input } from '../arc/input/input';
import { Select } from '../arc/select/select';
import { Accordion } from '../arc/accordion/accordion';

type TrackOption = {
  id: string;
  title: string;
  total: number;
};

type ExplorerItem = {
  id: string;
  title: string;
  href: string;
  marker: string;
  active: boolean;
};

type ModuleOption = {
  id: string;
  title: string;
  items: ExplorerItem[];
};

type SearchEntry = ExplorerItem & {
  searchText: string;
};

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
        {module.items.map((item) => (
          <a
            key={item.id}
            className="item-row"
            href={item.href}
            aria-current={item.active ? 'page' : undefined}
          >
            <span className="item-marker" aria-hidden="true">{item.marker}</span>
            <span className="item-copy">
              <span className="item-id">{item.id}</span>
              <span className="item-title">{item.title}</span>
            </span>
          </a>
        ))}
      </nav>
    ),
  }));

  return (
    <div className="curriculum-controls">
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
          <p className="explorer-label">HASIL</p>
          {results.length ? results.map((entry) => (
            <a key={entry.id} className="search-row" href={entry.href}>
              <span className="item-marker" aria-hidden="true">{entry.marker}</span>
              <span>
                <strong>{entry.id}</strong>
                <small>{entry.title}</small>
              </span>
            </a>
          )) : <p className="search-empty">Tidak ada materi yang cocok.</p>}
        </div>
      ) : (
        <>
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
              <p className="explorer-label">MODULE</p>
              <Accordion items={accordionItems} defaultOpen={defaultOpen} />
            </div>
          )}

          {integrations.length > 0 && (
            <div className="integration-list">
              <p className="explorer-label">INTEGRATION</p>
              {integrations.map((item) => (
                <a
                  key={item.id}
                  className="item-row"
                  href={item.href}
                  aria-current={item.active ? 'page' : undefined}
                >
                  <span className="item-marker" aria-hidden="true">{item.marker}</span>
                  <span className="item-copy">
                    <span className="item-id">{item.id}</span>
                    <span className="item-title">{item.title}</span>
                  </span>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
