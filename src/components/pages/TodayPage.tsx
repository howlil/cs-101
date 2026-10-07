import { ChevronRight, Home, RotateCcw } from 'lucide-react';
import EmptyAction from '../ui/EmptyAction';
import ActionLink from '../ui/ActionLink';

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
  return <div className="content today-page">
    <p className="eyebrow"><Home size={13} strokeWidth={1.8} aria-hidden="true" /> HARI INI</p>
    <h1>Hari ini</h1>

    {primary ? (
      <section className="today-focus">
        <p className="today-path">{primary.breadcrumb}</p>
        <div className="today-title-line">
          <code className="today-item-id">{primary.id}</code>
          <h2>{primary.title}</h2>
        </div>
        {primary.whyMatters && (
          <div className="today-why">
            <span>Kenapa penting</span>
            <p>{primary.whyMatters}</p>
          </div>
        )}
        <div className="today-next-step">
          <span>Berikutnya</span>
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
          <h2><RotateCcw size={15} strokeWidth={1.8} aria-hidden="true" /> Review</h2>
          {reviewCount > 1 && <span>{reviewCount}</span>}
        </div>
        <a className="today-review-row" href={review.href}>
          <RotateCcw size={14} strokeWidth={1.8} aria-hidden="true" />
          <span className="today-review-copy">
            <span><code>{review.id}</code><strong>{review.title}</strong></span>
            <small>{review.description}</small>
          </span>
          <span className="today-review-cta">{review.actionLabel}<ChevronRight size={13} strokeWidth={1.8} aria-hidden="true" /></span>
        </a>
      </section>
    ) : null}
  </div>;
}
