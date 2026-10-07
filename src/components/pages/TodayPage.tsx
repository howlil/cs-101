import { Home, RotateCcw } from 'lucide-react';
import EmptyAction from '../arc/EmptyAction';
import TaskCard from '../arc/TaskCard';
import ActionLink from '../arc/ActionLink';

type CardData = {
  id: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
};

type PrimaryCardData = CardData & {
  breadcrumb: string;
  nextStep: string;
  whyNext: string;
  whyMatters?: string;
};

export default function TodayPage({
  primary,
  review,
  reviewCount = 0,
}: {
  primary?: PrimaryCardData;
  review?: CardData;
  reviewCount?: number;
}) {
  return <div className="content">
    <p className="eyebrow"><Home size={13} strokeWidth={1.8} aria-hidden="true" /> BELAJAR / HARI INI</p>
    <h1>Lanjut dari sini.</h1>
    <p className="lede">Satu fokus utama. Satu langkah berikutnya.</p>

    {primary ? (
      <section className="today-focus">
        <p className="today-path">{primary.breadcrumb}</p>
        <code className="today-item-id">{primary.id}</code>
        <h2>{primary.title}</h2>
        {primary.whyMatters && (
          <div className="today-why">
            <span>Kenapa ini penting</span>
            <p>{primary.whyMatters}</p>
          </div>
        )}
        <div className="today-next-step">
          <span>Kerjakan ini dulu</span>
          <strong>{primary.nextStep}</strong>
          <small>{primary.whyNext}</small>
        </div>
        <ActionLink href={primary.href} label={primary.actionLabel} />
      </section>
    ) : (
      <EmptyAction
        title="Tidak ada item yang siap."
        description="Periksa prasyarat di kurikulum."
        href="/curriculum"
        actionLabel="Buka kurikulum"
      />
    )}

    {review ? (
      <section className="today-review">
        <div className="today-review-heading">
          <h2><RotateCcw size={16} strokeWidth={1.8} aria-hidden="true" /> Review</h2>
          {reviewCount > 1 && <span>{reviewCount} perlu dikerjakan</span>}
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
    <p className="muted small">Selesai ditentukan oleh bukti. Review menguji apakah pemahaman masih bisa dipanggil kembali.</p>
  </div>;
}
