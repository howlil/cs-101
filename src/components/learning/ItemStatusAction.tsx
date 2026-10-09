"use client";

import { CheckCircle2, LockKeyhole, TriangleAlert } from 'lucide-react';
import type { ItemActionState } from '../../domain/learning/item-action';
import { Badge } from '../arc/badge/badge';
import ActionLink from '../ui/ActionLink';
import ActivateItem from './ActivateItem';

type Kind = 'unit' | 'checkpoint' | 'integration';

const startLabel = (kind: Kind, resumed: boolean) => resumed ? 'Lanjut belajar'
  : kind === 'unit' ? 'Mulai belajar'
  : kind === 'checkpoint' ? 'Mulai project' : 'Mulai latihan gabungan';

export default function ItemStatusAction({
  itemId, kind, state, href, mode = 'detail', prerequisites = [],
}: {
  itemId: string;
  kind: Kind;
  state: ItemActionState;
  href?: string;
  mode?: 'preview' | 'detail';
  prerequisites?: Array<{ id: string; title: string; href: string }>;
}) {
  if (state.status === 'passed') return <div className="item-action-status">
    <Badge tone="success" icon={<CheckCircle2 size={14} />}>Selesai</Badge>
    {mode === 'preview' && href && <ActionLink href={href} label={kind === 'unit' ? 'Buka materi' : 'Buka workspace'} />}
  </div>;

  if (state.status === 'locked') return <div className="item-action-status item-action-locked">
    <Badge tone="neutral" icon={<LockKeyhole size={14} />}>Terkunci · prasyarat belum terpenuhi</Badge>
    {state.missingPrerequisites.length > 0 && <div className="item-action-prerequisites">
      <span className="eyebrow">SELESAIKAN TERLEBIH DAHULU</span>
      {state.missingPrerequisites.map((id) => {
        const prerequisite = prerequisites.find((entry) => entry.id === id);
        return prerequisite
          ? <a key={id} href={prerequisite.href}>{id} · {prerequisite.title}</a>
          : <span key={id}>{id}</span>;
      })}
    </div>}
  </div>;

  if (state.status === 'stale') return <div className="item-action-status">
    <Badge tone="warning" icon={<TriangleAlert size={14} />}>Perlu diperbarui</Badge>
    {state.isFocused
      ? <Badge tone="info">Sedang dikerjakan</Badge>
      : state.canActivate
        ? <ActivateItem itemId={itemId} label="Perbarui & validasi" />
        : mode === 'preview' && href
          ? <ActionLink href={href} label="Buka & periksa" />
          : null}
  </div>;

  if (state.status === 'active') return <div className="item-action-status">
    {mode === 'preview' && href
      ? <ActionLink href={href} label="Lanjut belajar" />
      : <Badge tone="info">Sedang dikerjakan</Badge>}
  </div>;

  if (state.canActivate) return <div className="item-action-status">
    <ActivateItem itemId={itemId} label={startLabel(kind, state.status === 'started')} />
  </div>;

  return <div className="item-action-status">
    <Badge tone="neutral">Status belum tersedia</Badge>
    {href && <ActionLink href={href} label="Buka materi" />}
  </div>;
}
