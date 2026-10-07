import {
  BarChart3,
  BookOpen,
  Boxes,
  BrainCircuit,
  Download,
  History,
  Check,
} from 'lucide-react';
import EmptyAction from '../ui/EmptyAction';
import { Button } from '../arc/button/button';

const REVIEW_DAYS = [1, 3, 7, 14, 30] as const;

type ReviewRow = {
  id: string;
  title: string;
  state: 'due' | 'retry';
  step: number;
  dueAt: string | null;
};
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
  title: string;
  recordedAt: string;
  continueFrom: string;
  kind: 'progress' | 'passed';
  minutes?: number;
  evidenceCount: number;
  reflectionSummary?: string;
};

function RetentionSteps({ step }: { step: number }) {
  return <div className="retention-steps" aria-label="Tahap retention">
    {REVIEW_DAYS.map((day, index) => (
      <span
        key={day}
        className={index < step ? 'is-done' : index === step ? 'is-current' : ''}
      >
        {index < step && <Check size={10} strokeWidth={2} aria-hidden="true" />}D{day}
      </span>
    ))}
  </div>;
}

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
      <p className="eyebrow"><BarChart3 size={13} strokeWidth={1.8} aria-hidden="true" /> BELAJAR / PROGRES</p>
      <h1>Posisi belajar.</h1>
      <p className="lede">Lihat posisi sekarang, review yang perlu dikerjakan, dan jejak sesi terakhir.</p>
    </div>

    {reviews.length > 0 && (
      <section className="progress-review-queue">
        <div className="progress-section-heading">
          <div>
            <p className="eyebrow">PERLU AKSI</p>
            <h2><BrainCircuit size={17} strokeWidth={1.8} aria-hidden="true" /> Review</h2>
          </div>
          <span>{reviews.length}</span>
        </div>
        <div className="progress-review-items">
          {reviews.map((review) => (
            <a key={review.id} href={'/review/' + review.id}>
              <BrainCircuit size={14} strokeWidth={1.8} aria-hidden="true" />
              <div className="progress-review-copy">
                <span><code>{review.id}</code> {review.title}</span>
                <RetentionSteps step={review.step} />
              </div>
              <small>{review.state === 'retry' ? 'Ulangi' : 'Hari ini'}</small>
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
                  {module.active ? 'Sedang dikerjakan · ' : ''}
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
            <p className="eyebrow">LINTAS JALUR</p>
            <h2><Boxes size={17} strokeWidth={1.8} aria-hidden="true" /> Integrasi</h2>
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
      <div className="progress-section-heading">
        <div>
          <p className="eyebrow">SESI</p>
          <h2><History size={17} strokeWidth={1.8} aria-hidden="true" /> Riwayat terbaru</h2>
        </div>
      </div>
      {sessions.length ? (
        sessions.map((session) => (
          <article className="history-entry" key={session.id + session.recordedAt}>
            <div className="history-heading">
              <div>
                <code>{session.id}</code>
                <strong>{session.title}</strong>
              </div>
              <span>{session.kind === 'passed' ? 'Selesai' : 'Sesi belajar'}</span>
            </div>
            <p className="small muted">
              <time dateTime={session.recordedAt}>{new Date(session.recordedAt).toLocaleString('id-ID')}</time>
              {session.minutes ? ' · ' + session.minutes + ' menit' : ''}
              {session.evidenceCount ? ' · ' + session.evidenceCount + ' bukti' : ''}
            </p>
            {session.reflectionSummary && <p className="history-reflection">Refleksi: {session.reflectionSummary}</p>}
            {session.continueFrom && <p className="history-next"><strong>Lanjut:</strong> {session.continueFrom}</p>}
          </article>
        ))
      ) : (
        <EmptyAction
          title="Belum ada sesi tersimpan."
          description="Simpan titik lanjut setelah belajar agar sesi berikutnya tidak mulai dari nol."
        />
      )}
    </section>

    <div className="actions">
      <form action="/api/export" method="get" data-astro-reload="">
        <Button type="submit" variant="secondary">
          <Download size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>Ekspor progres</span>
        </Button>
      </form>
    </div>
  </div>;
}
