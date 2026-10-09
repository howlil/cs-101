"use client";

import { Accordion } from '../arc/accordion/accordion';

export default function GuaranteeAccordion({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return <Accordion items={[{
    title,
    content: <ol>{items.map((item) => <li key={item}>{item}</li>)}</ol>,
  }]} />;
}
