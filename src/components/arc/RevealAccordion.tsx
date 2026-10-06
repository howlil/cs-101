"use client";

import { Accordion } from './accordion/accordion';

interface Props { title: string; contentHtml: string }

export default function RevealAccordion({ title, contentHtml }: Props) {
  const content = <div dangerouslySetInnerHTML={{ __html: contentHtml }} />;
  return <Accordion items={[{ title, content }]} defaultOpen={-1} />;
}
