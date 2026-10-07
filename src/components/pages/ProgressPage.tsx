import {
  BarChart3,
  BookOpen,
  Boxes,
  BrainCircuit,
  Download,
  History,
} from 'lucide-react';
import EmptyAction from '../arc/EmptyAction';
import { Button } from '../arc/button/button';

type ReviewRow = { id: string; title: string; state: 'due' | 'retry' };
type ModuleRow = {
  id: string;
  title: string;
  href: string;
  completed: number;
  total: number;
  active: boolean;
  reviewActions: number;
};
type TrackRow = {
  id: string;
  title: string;
  href: string;
  completed: number;
  total: number;
  reviewActions: number;
  modules: ModuleRow[];
};
type IntegrationRow = {
  id: string;
  title: string;
  href: string;
  stateLabel: string;
  reviewLabel: string;
  passed: boolean;
};
type SessionRow = {
  id: string;
  recordedAt: string;
  continueFrom: string;
};

export default function ProgressPage({
  reviews,
  tracks,
  integrations,
  sessions,
}: {
  reviews: ReviewRow[];
  tracks: TrackRow[];
  integrations: IntegrationRow[];
  sessions: SessionRow[];
}) {
  return <div className="progress-page">
    <div className="content">
      <p className="eyebrow">BELAJAR / PROGRES</p>
      <h1>Posisi curriculum.</h1>
      <p className="lede">Completion berasal dari evidence. Review adalah retention state yang terpisah.</p>
    </div>

    {reviews.length > 0 && (
      <section className="progress-review-queue">
        <div className="progress-section-heading">
          <div>
            <p className="eyebrow">ACTION</p>
            <h2><BrainCircuit size={17} strokeWidth={1.8} aria-hidden="true" /> Review yang perlu dikerjakan</h2>
          </div>
          <span>{reviews.length}</span>
        </div>
        <div className="progress-review-items">
          {reviews.map((review) => (
            <a key={review.id} href={'/review/' + review.id}>
              <BrainCircuit size={14} strokeWidth={1.8} aria-hidden="true" />
              <code>{review.id}</code>
              <span>{review.title}</span>
              <small>{review.state === 'retry' ? 'Retry' : 'Due'}</small>
            </a>
          ))}
        </div>
      </section>
    )}

    <div className="progress-tracks">
      {tracks.map((track) => (
        <section className="progress-track" key={track.id}>
          <div className="progress-track-heading">
            <a href={track.href}><BarChart3 size={14} strokeWidth={1.8} aria-hidden="true" /> {track.title}</a>
            <span>
              {track.completed}/{track.total}
              {track.reviewActions ? ' · ' + track.reviewActions + ' review' : ''}
            </span>
          </div>
          <div className="progress-modules">
            {track.modules.map((module) => (
              <a href={module.href} key={module.id}>
                <BookOpen size={14} strokeWidth={1.8} aria-hidden="true" />
                <span>{module.title}</span>
                <small>
                  {module.active ? 'Aktif · ' : ''}
                  {module.completed}/{module.total}
                  {module.reviewActions ? ' · ' + module.reviewActions + 'R' : ''}
                </small>
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>

    {integrations.length > 0 && (
      <section className="progress-integrations">
        <div className="progress-section-heading">
          <div>
            <p className="eyebrow">CROSS-TRACK</p>
            <h2><Boxes size={17} strokeWidth={1.8} aria-hidden="true" /> Integration</h2>
          </div>
          <span>{integrations.filter((item) => item.passed).length}/{integrations.length}</span>
        </div>
        <div className="progress-integration-items">
          {integrations.map((item) => (
            <a href={item.href} key={item.id}>
              <Boxes size={14} strokeWidth={1.8} aria-hidden="true" />
              <code>{item.id}</code>
              <span>{item.title}</span>
              <small>
                {item.stateLabel}
                {item.reviewLabel ? ' · ' + item.reviewLabel : ''}
              </small>
            </a>
          ))}
        </div>
      </section>
    )}

    <section className="progress-history">
      <h2><History size={17} strokeWidth={1.8} aria-hidden="true" /> Riwayat sesi</h2>
      {sessions.length ? (
        sessions.map((session) => (
          <article className="history-entry" key={session.id + session.recordedAt}>
            <p className="small muted">
              {session.id} · <time dateTime={session.recordedAt}>{session.recordedAt}</time>
            </p>
            <p>{session.continueFrom || 'Evidence tersimpan.'}</p>
          </article>
        ))
      ) : (
        <EmptyAction
          title="Belum ada sesi tersimpan."
          description="Catatan sesi akan tampil di sini setelah disimpan."
        />
      )}
    </section>

    <div className="actions">
      <form action="/api/export" method="get">
        <Button type="submit" variant="secondary">
          <Download size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>Ekspor progres</span>
        </Button>
      </form>
    </div>
  </div>;
}
