import { SearchX } from 'lucide-react';
import EmptyAction from '../ui/EmptyAction';

export default function NotFoundPage() {
  return <div className="content">
    <p className="eyebrow"><SearchX size={14} strokeWidth={1.8} aria-hidden="true" /> 404</p>
    <EmptyAction
      title="Halaman tidak ditemukan."
      description="Cek Item ID atau kembali ke curriculum."
      href="/curriculum"
      actionLabel="Buka curriculum"
    />
  </div>;
}
