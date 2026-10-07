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
          <h2><RotateCcw size={15} strokeWidth={1.8} aria-hidden="true" /> Review</h2>
          {reviewCount > 1 && <span>{reviewCount} perlu dikerjakan</span>}
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
    ) : (
      <p className="today-review-empty">Tidak ada review yang perlu dikerjakan sekarang.</p>
    )}

    <hr />
    <p className="muted small">Selesai ditentukan oleh bukti. Review menguji apakah pemahaman masih bisa dipanggil kembali.</p>
  </div>;
}
