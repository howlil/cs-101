import { Link2 } from 'lucide-react';

export type ConnectionGroupData = {
  label: string;
  items: Array<{ id: string; title: string; href: string }>;
};

export default function ConnectionsPanel({
  groups,
  compact = false,
}: {
  groups: ConnectionGroupData[];
  compact?: boolean;
}) {
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  if (!total) return null;

  return <section className={['connections-panel', compact ? 'connections-panel--compact' : ''].filter(Boolean).join(' ')}>
    <div className="connections-heading">
      <h2>Hubungan materi</h2>
      <span>{total}</span>
    </div>

    <div className="connection-groups">
      {groups.map((group) => (
        <div className="connection-group" key={group.label}>
          <h3>{group.label}</h3>
          <div className="connection-items">
            {group.items.map((item) => (
              <a href={item.href} key={item.id}>
                <Link2 size={13} strokeWidth={1.8} aria-hidden="true" />
                <code>{item.id}</code>
                <span>{item.title}</span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>

    <p className="connections-note">
      Hanya <strong>Harus selesai dulu</strong> yang wajib. Hubungan lain hanya referensi.
    </p>
  </section>;
}
