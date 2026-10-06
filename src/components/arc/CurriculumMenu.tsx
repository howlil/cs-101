import { Accordion } from './accordion/accordion';
import styles from './curriculum-menu.module.css';

export interface CurriculumLink {
  taskId: string;
  title: string;
  href: string;
  active: boolean;
}

interface Track {
  title: string;
  active: boolean;
  tasks: CurriculumLink[];
}

export default function CurriculumMenu({ tracks, currentPath }: { tracks: Track[]; currentPath: string }) {
  const activeTrack = tracks.findIndex((track) => track.active);
  const items = tracks.map((track) => ({
    title: track.title,
    content: <nav aria-label={track.title}><ul className={styles.tasks}>{track.tasks.map((task) =>
        <li key={task.taskId}>
          <a href={task.href} aria-current={task.active ? 'page' : undefined}>
            <span className={styles.code}>{task.taskId}</span>{task.title}
          </a>
        </li>,
      )}</ul></nav>,
  }));

  if (items.length === 0) {
    return <div className={styles.empty}>
      <p>Belum ada task di curriculum.</p>
      <a href="/demo" aria-current={currentPath === '/demo' ? 'page' : undefined}>Lihat contoh materi</a>
    </div>;
  }

  return <div className={styles.root}><Accordion items={items} defaultOpen={activeTrack >= 0 ? activeTrack : 0} /></div>;
}
