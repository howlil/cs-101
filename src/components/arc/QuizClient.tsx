"use client";

import { useState, type SubmitEvent } from 'react';
import { Alert } from './alert/alert';
import { Button } from './button/button';
import { RadioGroup } from './radio-group/radio-group';
import styles from './quiz.module.css';

interface QuizItem {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

function QuizQuestion({ item, index }: { item: QuizItem; index: number }) {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<{ correct: boolean; explanation: string }>();
  const options = item.options.map((label, optionIndex) => ({ value: String(optionIndex), label }));

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (value === '') return;
    setResult({ correct: Number(value) === item.answer, explanation: item.explanation });
  };

  return <form className={styles.question} onSubmit={submit}>
    <RadioGroup label={item.question} name={`answer-${index}`} options={options} value={value} onValueChange={(next) => { setValue(next); setResult(undefined); }} />
    <Button type="submit" variant="primary" disabled={value === ''}>Cek jawaban</Button>
    {result && <Alert title={result.correct ? 'Jawaban benar.' : 'Belum tepat.'} tone={result.correct ? 'success' : 'warning'}>{result.explanation}</Alert>}
  </form>;
}

export default function QuizClient({ items }: { items: QuizItem[] }) {
  return <div className={styles.quiz}>{items.map((item, index) => <QuizQuestion key={`${item.question}-${index}`} item={item} index={index} />)}</div>;
}
