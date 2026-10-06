import { Card } from './card/card';
import styles from './task-card.module.css';

interface Props {
  taskId: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  status?: string;
}

export default function TaskCard({ taskId, title, description, href, actionLabel, status }: Props) {
  return <Card
    title={title}
    description={description}
    meta={taskId}
    status={status}
    action={<a className={styles.action} href={href}>{actionLabel}</a>}
  />;
}
