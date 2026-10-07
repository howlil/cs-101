"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Criterion } from '../../domain/curriculum-v2/schema';
import type { SessionFields } from '../../domain/learning/schema';
import { Accordion } from '../arc/accordion/accordion';
import { Alert, type AlertTone } from '../arc/alert/alert';
import { Button } from '../arc/button/button';
import { Textarea } from '../arc/textarea/textarea';
import { postJson, readDraft, removeDraft, writeDraft } from './client';

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
};

type EvidenceMap = Record<string, string>;
type MutationResult = { revision: number };

export default function EvidenceForm({
  itemId,
  fingerprint,
  revision,
  groups,
  continueFrom = '',
  lastAnchor = '',
  saveLabel = 'Simpan sesi',
  passLabel = 'Ajukan lulus',
  className = '',
}: Props) {
  const criteria = useMemo(() => groups.flatMap((group) => group.criteria), [groups]);
  const [evidence, setEvidence] = useState<EvidenceMap>({});
  const [nextStep, setNextStep] = useState(continueFrom);
  const [currentRevision, setCurrentRevision] = useState(revision);
  const [hydrated, setHydrated] = useState(false);
  const [loadingKind, setLoadingKind] = useState<'progress' | 'passed'>();
  const [feedback, setFeedback] = useState<{ title: string; message: string; tone: AlertTone }>();
  const request = useRef<{ key: string; id: string } | undefined>(undefined);

  const session = (kind: 'progress' | 'passed'): SessionFields => ({
    itemId,
    fingerprint,
    kind,
    evidence: criteria
      .map((criterion) => ({ criterionId: criterion.id, text: evidence[criterion.id]?.trim() ?? '' }))
      .filter((entry) => entry.text),
    continueFrom: nextStep.trim(),
    lastAnchor: window.location.hash.slice(1) || lastAnchor,
  });

  useEffect(() => {
    const draft = readDraft(itemId);
    if (draft?.fingerprint === fingerprint) {
      setEvidence(Object.fromEntries(draft.evidence.map((entry) => [entry.criterionId, entry.text])));
      setNextStep(draft.continueFrom);
      setFeedback({
        title: 'Draft dipulihkan',
        message: 'Draft lokal dipulihkan. Belum tersimpan sebagai sesi.',
        tone: 'info',
      });
    }
    setHydrated(true);
  }, [fingerprint, itemId]);

  useEffect(() => {
    if (!hydrated) return;
    writeDraft(itemId, {
      itemId,
      fingerprint,
      kind: 'progress',
      evidence: criteria
        .map((criterion) => ({ criterionId: criterion.id, text: evidence[criterion.id]?.trim() ?? '' }))
        .filter((entry) => entry.text),
      continueFrom: nextStep,
      lastAnchor,
    });
  }, [criteria, evidence, fingerprint, hydrated, itemId, lastAnchor, nextStep]);

  const submit = async (kind: 'progress' | 'passed') => {
    if (loadingKind) return;
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
        title: kind === 'passed' ? 'Completion tersimpan' : 'Sesi tersimpan',
        message: kind === 'passed'
          ? 'Evidence sudah disimpan dan completion diperbarui.'
          : 'Catatan sesi sudah tersimpan.',
        tone: 'success',
      });
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

  return <form className={['session-form', className].filter(Boolean).join(' ')}>
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
            <Accordion items={[{
              title: group.referenceTitle,
              content: <ol>{group.referenceItems.map((item) => <li key={item}>{item}</li>)}</ol>,
            }]} />
          </div>
        ) : null}
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

    <section className="evidence-continuation">
      <Textarea
        label="Lanjut dari mana?"
        name="continueFrom"
        rows={3}
        maxLength={4000}
        value={nextStep}
        onChange={(event) => setNextStep(event.currentTarget.value)}
      />
      <div className="actions">
        <Button
          type="button"
          variant="primary"
          loading={loadingKind === 'progress'}
          disabled={Boolean(loadingKind)}
          onClick={() => void submit('progress')}
        >
          {saveLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={loadingKind === 'passed'}
          disabled={Boolean(loadingKind)}
          onClick={() => void submit('passed')}
        >
          {passLabel}
        </Button>
      </div>
      {feedback && (
        <Alert open title={feedback.title} tone={feedback.tone}>
          {feedback.message}
        </Alert>
      )}
    </section>
  </form>;
}
