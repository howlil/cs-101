"use client";

import { Accordion } from '../arc/accordion/accordion';

export default function RevealAccordion({ title, contentHtml }: { title: string; contentHtml: string }) {
  const content = <div dangerouslySetInnerHTML={{ __html: contentHtml }} />;
  return <Accordion items={[{ title, content }]} defaultOpen={-1} size="sm" />;
}
