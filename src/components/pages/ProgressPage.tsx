import {
  BarChart3,
  BookOpen,
  Boxes,
  BrainCircuit,
  Download,
  History
} from 'lucide-react';
import EmptyAction from '../ui/EmptyAction';
import { Button } from '../arc/button/button';
import { Accordion } from '../arc/accordion/accordion';

type ReviewRow = {
  id: string;
  title: string;
  state: 'due' | 'retry';
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
  blocker?: string;
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
    <header className="compact-page-header">
      <p className="eyebrow"><BarChart3 size={13} strokeWidth={1.8} aria-hidden="true" /> PROGRES</p>
      <h1>Progres</h1>
    </header>

    <div className="progress-workbench">
      <section className="progress-primary">
        <section className="progress-overview" aria-label="Progres per jalur">
          <div className="progress-section-heading">
            <div><p className="eyebrow">JALUR BELAJAR</p><h2>Yang sudah diselesaikan</h2></div>
            <span>{tracks.reduce((sum, track) => sum + track.completed, 0)} / {tracks.reduce((sum, track) => sum + track.total, 0)}</span>
          </div>
          <p className="progress-integrations-note">Materi dan project dikelompokkan dalam {tracks.length} jalur; {integrations.length} latihan gabungan dihitung terpisah.</p>
          <Accordion
            size="sm"
            defaultOpen={tracks.findIndex((track) => track.modules.some((module) => module.active))}
            items={tracks.map((track) => ({
              title: track.title + ' · ' + track.completed + '/' + track.total + (track.reviewActions ? ' · ' + track.reviewActions + ' review' : ''),
              content: <div className="progress-track-panel">
                <a className="progress-track-open" href={track.href}>Lihat jalur di kurikulum</a>
                <div className="progress-modules">
                  {track.modules.map((module) => (
                    <a href={module.href} key={module.id} aria-label={module.title + ', ' + module.completed + ' dari ' + module.total + ' selesai'}>
                      <BookOpen size={14} strokeWidth={1.8} aria-hidden="true" />
                      <span>{module.title}</span>
                      <small>{module.active ? 'Aktif · ' : ''}{module.completed}/{module.total}{module.reviewActions ? ' · ' + module.reviewActions + ' review' : ''}</small>
                    </a>
                  ))}
                </div>
              </div>,
            }))}
          />
        </section>

      {(reviews.length > 0 || integrations.length > 0) && (
        <section className="progress-actions" aria-label="Aksi progres">
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
                      <small>5 pertanyaan · tanpa catatan</small>
                    </div>
                    <small>{review.state === 'retry' ? 'Ulangi' : 'Hari ini'}</small>
                  </a>
                ))}
              </div>
            </section>
          )}

          {integrations.length > 0 && (
            <section className="progress-integrations">
              <div className="progress-section-heading">
                <div>
                  <p className="eyebrow">LINTAS JALUR</p>
                  <h2><Boxes size={17} strokeWidth={1.8} aria-hidden="true" /> Latihan gabungan</h2>
                </div>
                <span>{integrations.filter((item) => item.passed).length}/{integrations.length}</span>
              </div>
              <div className="progress-integration-items">
                {integrations.map((item) => (
                  <a href={item.href} key={item.id}>
                    <Boxes size={14} strokeWidth={1.8} aria-hidden="true" />
                    <span className="progress-integration-copy">
                      <code>{item.id}</code>
                      <strong>{item.title}</strong>
                    </span>
                    <small>
                      {item.stateLabel}
                      {item.reviewLabel ? ' · ' + item.reviewLabel : ''}
                    </small>
                  </a>
                ))}
              </div>
            </section>
          )}
        </section>
      )}

        <section className="progress-history">
          <div className="progress-section-heading">
            <div>
              <p className="eyebrow">SESI</p>
              <h2><History size={17} strokeWidth={1.8} aria-hidden="true" /> Terbaru</h2>
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
                  <span>{session.kind === 'passed' ? 'Selesai' : 'Sesi'}</span>
                </div>
                <p className="small muted">
                  <time dateTime={session.recordedAt}>{new Date(session.recordedAt).toLocaleString('id-ID')}</time>
                  {session.minutes ? ' · ' + session.minutes + 'm' : ''}
                  {session.evidenceCount ? ' · ' + session.evidenceCount + ' bukti' : ''}
                </p>
                {session.reflectionSummary && <p className="history-reflection">{session.reflectionSummary}</p>}
                {session.blocker && <p className="history-blocker"><strong>Hambatan:</strong> {session.blocker}</p>}
                {session.continueFrom && <p className="history-next"><strong>Lanjut:</strong> {session.continueFrom}</p>}
              </article>
            ))
          ) : (
            <EmptyAction
              title="Belum ada sesi."
              description="Simpan sesi pertama untuk mulai membentuk riwayat."
            />
          )}
        </section>

        <div className="actions">
          <form action="/api/export" method="get" data-astro-reload="">
            <Button type="submit" variant="secondary" size="sm">
              <Download size={14} strokeWidth={1.8} aria-hidden="true" />
              <span>Ekspor</span>
            </Button>
          </form>
        </div>
      </section>


    </div>
  </div>;
}
