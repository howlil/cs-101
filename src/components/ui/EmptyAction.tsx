import { EmptyState } from '../arc/empty-state/empty-state';
import ActionLink from './ActionLink';

export default function EmptyAction({
  title,
  description,
  href,
  actionLabel,
}: {
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
}) {
  return <EmptyState
    title={title}
    description={description}
    action={href && actionLabel ? <ActionLink href={href} label={actionLabel} /> : undefined}
  />;
}
