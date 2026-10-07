import { Home, RotateCcw } from 'lucide-react';
import EmptyAction from '../arc/EmptyAction';
import TaskCard from '../arc/TaskCard';

type CardData = {
  id: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
};

export default function TodayPage({
  primary,
  review,
  reviewCount = 0,
}: {
  primary?: CardData;
  review?: CardData;
  reviewCount?: number;
}) {
  return <div className="content">
    <p className="eyebrow"><Home size={13} strokeWidth={1.8} aria-hidden="true" /> BELAJAR / HARI INI</p>
    <h1>Lanjut dari sini.</h1>
    <p className="lede">Satu item. Satu langkah berikutnya.</p>

    {primary ? (
      <TaskCard
        taskId={primary.id}
        title={primary.title}
        description={primary.description}
        href={primary.href}
        actionLabel={primary.actionLabel}
      />
    ) : (
      <EmptyAction
        title="Tidak ada item yang siap."
        description="Periksa prerequisite di curriculum."
        href="/curriculum"
        actionLabel="Buka curriculum"
      />
    )}

    {review ? (
      <section className="today-review">
        <div className="today-review-heading">
          <h2><RotateCcw size={16} strokeWidth={1.8} aria-hidden="true" /> Review</h2>
          {reviewCount > 1 && <span>{reviewCount} actionable</span>}
        </div>
        <TaskCard
          taskId={review.id}
          title={review.title}
          description={review.description}
          href={review.href}
          actionLabel={review.actionLabel}
        />
      </section>
    ) : (
      <p className="today-review-empty">Tidak ada review yang perlu dikerjakan sekarang.</p>
    )}

    <hr />
    <p className="muted small">Progres dihitung dari evidence. Review mengukur retention setelah completion.</p>
  </div>;
}
