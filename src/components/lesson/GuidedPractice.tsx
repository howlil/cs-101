"use client";

import { useState } from 'react';
import { Button } from '../arc/button/button';
import styles from './guided-practice.module.css';

interface Props {
  title: string;
  prompt: string;
  hints: string[];
  explanation: string;
  starterCode?: string;
}

/** Non-persistent disclosure: useful help on demand without learner tracking. */
export default function GuidedPractice({ title, prompt, hints, explanation, starterCode }: Props) {
  const [visibleHints, setVisibleHints] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const completedHints = visibleHints >= hints.length;

  return <section className={styles.root} aria-label={title}>
    <h3>{title}</h3>
    <p>{prompt}</p>
    {starterCode && <pre className={styles.code}><code>{starterCode}</code></pre>}
    {visibleHints > 0 && <ol className={styles.hints} aria-label="Hint yang dibuka">
      {hints.slice(0, visibleHints).map((hint, index) => <li key={index}>{hint}</li>)}
    </ol>}
    {showExplanation && <div className={styles.explanation} role="status">
      <strong>Pembahasan</strong><p>{explanation}</p>
    </div>}
    <div className={styles.actions}>
      {!completedHints && <Button type="button" variant="secondary" size="sm"
        onClick={() => setVisibleHints((current) => Math.min(hints.length, current + 1))}>
        {visibleHints === 0 ? 'Butuh hint?' : 'Hint berikutnya'}
      </Button>}
      {!showExplanation && <Button type="button" variant="ghost" size="sm"
        onClick={() => setShowExplanation(true)}>
        Lihat pembahasan
      </Button>}
      {(visibleHints > 0 || showExplanation) && <Button type="button" variant="ghost" size="sm"
        onClick={() => { setVisibleHints(0); setShowExplanation(false); }}>
        Tutup bantuan
      </Button>}
    </div>
  </section>;
}
