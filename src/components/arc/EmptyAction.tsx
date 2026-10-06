import { EmptyState } from './empty-state/empty-state';
import styles from './empty-action.module.css';

interface Props {
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
}

export default function EmptyAction({ title, description, href, actionLabel }: Props) {
  const action = href && actionLabel
    ? <a className={styles.action} href={href}>{actionLabel}</a>
    : undefined;

  return <EmptyState title={title} description={description} action={action} />;
}
