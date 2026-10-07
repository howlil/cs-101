import { EmptyState } from './empty-state/empty-state';
import ActionLink from './ActionLink';

interface Props {
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
}

export default function EmptyAction({ title, description, href, actionLabel }: Props) {
  const action = href && actionLabel
    ? <ActionLink href={href} label={actionLabel} />
    : undefined;

  return <EmptyState title={title} description={description} action={action} />;
}
