"use client";

import { useEffect, useState } from 'react';
import { Alert, type AlertTone } from './alert/alert';

interface FeedbackMessage {
  scope: string;
  title: string;
  message: string;
  tone: AlertTone;
}

export default function Feedback({ scope }: { scope: string }) {
  const [feedback, setFeedback] = useState<FeedbackMessage>();

  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<FeedbackMessage>).detail;
      if (detail?.scope === scope) setFeedback(detail);
    };
    window.addEventListener('cs101:feedback', receive);
    return () => window.removeEventListener('cs101:feedback', receive);
  }, [scope]);

  return <Alert
    open={Boolean(feedback)}
    title={feedback?.title ?? ''}
    tone={feedback?.tone ?? 'info'}
  >{feedback?.message}</Alert>;
}
