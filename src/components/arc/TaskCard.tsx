import { Card } from './card/card';
import ActionLink from './ActionLink';

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
    action={<ActionLink href={href} label={actionLabel} />}
  />;
}
