"use client";

import { navigate } from 'astro:transitions/client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Criterion } from '../../domain/curriculum-v2/schema';
import type { SessionFields, SessionReflection } from '../../domain/learning/schema';
import { Accordion } from '../arc/accordion/accordion';
import { Alert, type AlertTone } from '../arc/alert/alert';
import { Button } from '../arc/button/button';
import { Input } from '../arc/input/input';
import { Textarea } from '../arc/textarea/textarea';
import { CheckCircle2, Save } from 'lucide-react';
import { hasSessionNotes, postJson, readDraft, removeDraft, writeDraft } from './client';

export type EvidenceGroup = {
  key: string;
  eyebrow?: string;
  title: string;
  description?: string;
  criteria: Criterion[];
  rows?: number;
  className?: string;
  referenceTitle?: string;
  referenceItems?: string[];
};

type Props = {
  itemId: string;
  fingerprint: string;
  revision: number;
  groups: EvidenceGroup[];
  continueFrom?: string;
  lastAnchor?: string;
  saveLabel?: string;
  passLabel?: string;
  className?: string;
  initialCompletionOpen?: boolean;
};

type EvidenceMap = Record<string, string>;
type MutationResult = { revision: number };

const emptyReflection = (): SessionReflection => ({
  wrongAssumption: '',
  evidenceChangedMind: '',
  tradeoffChosen: '',
  explainWithoutNotes: '',
  monitorInProduction: '',
});

export default function EvidenceForm({
  itemId,
  fingerprint,
  revision,
  groups,
  continueFrom = '',
  lastAnchor = '',
  saveLabel = 'Simpan & lanjut nanti',
  passLabel = 'Kirim bukti & selesaikan',
  className = '',
  initialCompletionOpen = false,
}: Props) {
  const criteria = useMemo(() => groups.flatMap((group) => group.criteria), [groups]);
  const [evidence, setEvidence] = useState<EvidenceMap>({});
  const [nextStep, setNextStep] = useState(continueFrom);
  const [blocker, setBlocker] = useState('');
  const [minutes, setMinutes] = useState('');
  const [reflection, setReflection] = useState<SessionReflection>(emptyReflection);
  const [completionOpen, setCompletionOpen] = useState(initialCompletionOpen);
  const [currentRevision, setCurrentRevision] = useState(revision);
  const [hydrated, setHydrated] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loadingKind, setLoadingKind] = useState<'progress' | 'passed'>();
  const [feedback, setFeedback] = useState<{ title: string; message: string; tone: AlertTone }>();
  const request = useRef<{ key: string; id: string } | undefined>(undefined);

  const reflectionPayload = () => {
    const clean = Object.fromEntries(
      Object.entries(reflection).map(([key, value]) => [key, value.trim()]),
    ) as SessionReflection;
    return Object.values(clean).some(Boolean) ? clean : undefined;
  };

  const minuteValue = () => {
    const value = Number(minutes);
    return Number.isInteger(value) && value > 0 ? value : undefined;
  };

  const session = (kind: 'progress' | 'passed'): SessionFields => ({
    itemId,
    fingerprint,
    kind,
    evidence: criteria
      .map((criterion) => ({ criterionId: criterion.id, text: evidence[criterion.id]?.trim() ?? '' }))
      .filter((entry) => entry.text),
    continueFrom: nextStep.trim(),
    blocker: blocker.trim(),
    lastAnchor: window.location.hash.slice(1) || lastAnchor,
    ...(minuteValue() ? { minutes: minuteValue() } : {}),
    ...(reflectionPayload() ? { reflection: reflectionPayload() } : {}),
  });

  useEffect(() => {
    const draft = readDraft(itemId);
    if (draft?.fingerprint === fingerprint && hasSessionNotes(draft)) {
      setDirty(true);
      setEvidence(Object.fromEntries(draft.evidence.map((entry) => [entry.criterionId, entry.text])));
      setNextStep(draft.continueFrom);
      setBlocker(draft.blocker ?? '');
      setMinutes(draft.minutes ? String(draft.minutes) : '');
      setReflection({ ...emptyReflection(), ...(draft.reflection ?? {}) });
      setCompletionOpen(initialCompletionOpen || draft.evidence.length > 0);
      setFeedback({
        title: 'Draft dipulihkan',
        message: 'Catatan lokal dipulihkan. Belum tersimpan sebagai sesi.',
        tone: 'info',
      });
    }
    setHydrated(true);
  }, [fingerprint, itemId, initialCompletionOpen]);

  useEffect(() => {
    if (!hydrated || !dirty) return;
    const draft: SessionFields = {
      itemId,
      fingerprint,
      kind: 'progress',
      evidence: criteria
        .map((criterion) => ({ criterionId: criterion.id, text: evidence[criterion.id]?.trim() ?? '' }))
        .filter((entry) => entry.text),
      continueFrom: nextStep,
      blocker,
      lastAnchor,
      ...(minuteValue() ? { minutes: minuteValue() } : {}),
      ...(reflectionPayload() ? { reflection: reflectionPayload() } : {}),
    };
    if (hasSessionNotes(draft)) writeDraft(itemId, draft);
    else removeDraft(itemId);
  }, [blocker, criteria, dirty, evidence, fingerprint, hydrated, itemId, lastAnchor, minutes, nextStep, reflection]);

  const submit = async (kind: 'progress' | 'passed') => {
    if (loadingKind) return;

    if (kind === 'passed') {
      const missing = criteria.filter((criterion) => !evidence[criterion.id]?.trim());
      if (missing.length) {
        setCompletionOpen(true);
        setFeedback({
          title: 'Bukti belum lengkap',
          message: `Lengkapi ${missing.length} target selesai sebelum menyelesaikan item.`,
          tone: 'warning',
        });
        return;
      }
    }

    if (kind === 'progress' && !nextStep.trim() && !blocker.trim() && !reflectionPayload() && !Object.values(evidence).some((value) => value.trim())) {
      setFeedback({
        title: 'Tambahkan satu catatan',
        message: 'Tulis titik lanjut, hambatan, bukti, atau catatan singkat sebelum menyimpan sesi.',
        tone: 'warning',
      });
      return;
    }

    setLoadingKind(kind);
    setFeedback({ title: 'Menyimpan sesi', message: 'Perubahan sedang disimpan.', tone: 'info' });

    try {
      const payload = { ...session(kind), revision: currentRevision };
      const key = JSON.stringify(payload);
      if (!request.current || request.current.key !== key) {
        request.current = { key, id: crypto.randomUUID() };
      }
      const next = await postJson<MutationResult>('/api/sessions', {
        ...payload,
        requestId: request.current.id,
      });
      setCurrentRevision(next.revision);
      request.current = undefined;
      removeDraft(itemId);
      setFeedback({
        title: kind === 'passed' ? 'Item selesai' : 'Sesi tersimpan',
        message: kind === 'passed'
          ? 'Bukti tersimpan. Review akan dijadwalkan otomatis.'
          : 'Titik lanjut dan refleksi sesi sudah tersimpan.',
        tone: 'success',
      });
      // A successful mutation invalidates every SSR-derived status/CTA/sidebar
      // on this route. React local feedback alone cannot refresh those views.
      // Re-fetch private HTML via Astro ClientRouter; keep the stage hash.
      navigate(window.location.href, { history: 'replace' });
    } catch (error) {
      setFeedback({
        title: 'Sesi belum tersimpan',
        message: error instanceof Error ? error.message : 'Sesi belum tersimpan. Coba lagi.',
        tone: 'danger',
      });
    } finally {
      setLoadingKind(undefined);
    }
  };

  const reflectionFields = (
    <div className="reflection-fields">
      <Textarea
        label="Sebelumnya saya mengira…"
        name="reflection:wrongAssumption"
        rows={2}
        maxLength={4000}
        value={reflection.wrongAssumption}
        onChange={(event) => setReflection((current) => ({ ...current, wrongAssumption: event.currentTarget.value }))}
      />
      <Textarea
        label="Pilihan atau trade-off yang saya ambil…"
        name="reflection:tradeoffChosen"
        rows={2}
        maxLength={4000}
        value={reflection.tradeoffChosen}
        onChange={(event) => setReflection((current) => ({ ...current, tradeoffChosen: event.currentTarget.value }))}
      />
      <Textarea
        label="Tanpa catatan, saya sekarang bisa menjelaskan…"
        name="reflection:explainWithoutNotes"
        rows={2}
        maxLength={4000}
        value={reflection.explainWithoutNotes}
        onChange={(event) => setReflection((current) => ({ ...current, explainWithoutNotes: event.currentTarget.value }))}
      />
      <Textarea
        label="Kalau ini production, saya akan monitor…"
        name="reflection:monitorInProduction"
        rows={2}
        maxLength={4000}
        value={reflection.monitorInProduction}
        onChange={(event) => setReflection((current) => ({ ...current, monitorInProduction: event.currentTarget.value }))}
      />
    </div>
  );

  return <form className={['session-form', className].filter(Boolean).join(' ')} onChangeCapture={() => setDirty(true)}>
    <section className="session-close">
      <div className="evidence-heading">
        <div>
          <p className="eyebrow">SESI</p>
          <h2>Akhiri sesi</h2>
        </div>
      </div>
      <p className="muted small">
        Simpan satu titik lanjut yang konkret. Durasi tidak menentukan kelulusan.
      </p>

      <Textarea
        label="Lanjut dari mana?"
        name="continueFrom"
        rows={3}
        maxLength={4000}
        value={nextStep}
        onChange={(event) => setNextStep(event.currentTarget.value)}
        placeholder="Contoh: ulangi 3 kasus NOT IN + NULL, lalu tulis invariant-nya."
      />

      <div className="session-reflection">
        <Accordion
          defaultOpen={-1}
          size="sm"
          items={[{
            title: 'Catatan sesi (opsional)',
            content: <div className="reflection-fields">
              <Textarea
                label="Apa yang menghambat?"
                name="blocker"
                rows={2}
                maxLength={4000}
                value={blocker}
                onChange={(event) => setBlocker(event.currentTarget.value)}
                placeholder="Contoh: masih bingung kenapa NOT IN + NULL menghasilkan hasil ini."
              />
              <Textarea
                label="Apa yang berubah dari pemahamanmu?"
                name="reflection:evidenceChangedMind"
                rows={2}
                maxLength={4000}
                value={reflection.evidenceChangedMind}
                onChange={(event) => setReflection((current) => ({ ...current, evidenceChangedMind: event.currentTarget.value }))}
              />
              <div className="session-meta-field">
                <Input
                  label="Menit belajar"
                  name="minutes"
                  type="number"
                  min={1}
                  max={1440}
                  inputMode="numeric"
                  value={minutes}
                  onChange={(event) => setMinutes(event.currentTarget.value)}
                />
              </div>
              <div className="deep-reflection">
                <p className="muted small">Kalau perlu refleksi lebih dalam:</p>
                {reflectionFields}
              </div>
            </div>,
          }]}
        />
      </div>

      <div className="actions">
        <Button
          type="button"
          variant="primary"
          loading={loadingKind === 'progress'}
          disabled={Boolean(loadingKind)}
          onClick={() => void submit('progress')}
        >
          <Save size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>{saveLabel}</span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={Boolean(loadingKind)}
          onClick={() => setCompletionOpen((open) => !open)}
          aria-expanded={completionOpen}
        >
          <CheckCircle2 size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>{completionOpen ? 'Tutup bukti' : 'Tambahkan bukti & selesaikan'}</span>
        </Button>
      </div>
    </section>

    {completionOpen && (
      <section className="evidence-completion">
        <div className="completion-rule">
          <strong>Aturan selesai</strong>
          <span>Semua target harus punya bukti yang bisa diperiksa. Durasi belajar saja tidak cukup.</span>
        </div>

        {groups.map((group) => (
          <section key={group.key} className={group.className}>
            <div className="evidence-heading">
              <div>
                {group.eyebrow && <p className="eyebrow">{group.eyebrow}</p>}
                <h2>{group.title}</h2>
              </div>
              <span>{group.criteria.length}</span>
            </div>
            {group.description && <p className="muted small">{group.description}</p>}
            {group.referenceTitle && group.referenceItems?.length ? (
              <div className="evidence-reference">
                <Accordion size="sm" items={[{
                  title: group.referenceTitle,
                  content: <ol>{group.referenceItems.map((item) => <li key={item}>{item}</li>)}</ol>,
                }]} />
              </div>
            ) : null}
            <p className="muted small evidence-hint">
              Bukti bisa berupa link commit/PR, hasil test atau command, benchmark, screenshot, diagram, atau catatan yang membuktikan target.
            </p>
            <fieldset>
              <legend className="sr-only">{group.title}</legend>
              {group.criteria.map((criterion) => (
                <Textarea
                  key={criterion.id}
                  label={criterion.text}
                  name={'evidence:' + criterion.id}
                  rows={group.rows ?? 2}
                  maxLength={8000}
                  value={evidence[criterion.id] ?? ''}
                  onChange={(event) => setEvidence((current) => ({
                    ...current,
                    [criterion.id]: event.currentTarget.value,
                  }))}
                />
              ))}
            </fieldset>
          </section>
        ))}

        <div className="actions">
          <Button
            type="button"
            variant="primary"
            loading={loadingKind === 'passed'}
            disabled={Boolean(loadingKind)}
            onClick={() => void submit('passed')}
          >
            <CheckCircle2 size={15} strokeWidth={1.8} aria-hidden="true" />
            <span>{passLabel}</span>
          </Button>
        </div>
      </section>
    )}

    {feedback && (
      <Alert open title={feedback.title} tone={feedback.tone}>
        {feedback.message}
      </Alert>
    )}
  </form>;
}
