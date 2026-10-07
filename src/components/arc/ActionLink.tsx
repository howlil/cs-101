import type { ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Download,
  Play,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import styles from './action-link.module.css';

function iconFor(label: string): ReactNode {
  const value = label.toLocaleLowerCase('id-ID');
  if (value.includes('kembali')) return <ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" />;
  if (value.includes('ekspor')) return <Download size={14} strokeWidth={1.8} aria-hidden="true" />;
  if (value.includes('review') || value.includes('ulangi')) return <RotateCcw size={14} strokeWidth={1.8} aria-hidden="true" />;
  if (value.includes('progres')) return <BarChart3 size={14} strokeWidth={1.8} aria-hidden="true" />;
  if (value.includes('materi') || value.includes('curriculum')) return <BookOpen size={14} strokeWidth={1.8} aria-hidden="true" />;
  if (value.includes('validasi')) return <RefreshCw size={14} strokeWidth={1.8} aria-hidden="true" />;
  if (value.includes('mulai') || value.includes('aktif')) return <Play size={14} strokeWidth={1.8} aria-hidden="true" />;
  if (value.includes('lanjut')) return <ArrowRight size={14} strokeWidth={1.8} aria-hidden="true" />;
  if (value.includes('buka')) return <ArrowUpRight size={14} strokeWidth={1.8} aria-hidden="true" />;
  return <ArrowRight size={14} strokeWidth={1.8} aria-hidden="true" />;
}

export default function ActionLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return <a className={[styles.action, className].filter(Boolean).join(' ')} href={href}>
    {iconFor(label)}
    <span>{label}</span>
  </a>;
}
