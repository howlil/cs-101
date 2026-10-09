import type { CurriculumItem } from '../curriculum-v2/schema';
import type { ReviewScheduleView } from '../review/policy';
import type { SessionFields } from './schema';
import { requiredEvidenceForItem, type AvailabilityState, type ItemProgressState } from './rules';

// One pure business decision boundary shared by SQLite and Cloudflare D1.
export class LearningError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function assertSessionAllowed(item: CurriculumItem, input: SessionFields, activeItemId: string | null): void {
  if (input.fingerprint !== item.fingerprint) {
    throw new LearningError(409, 'Curriculum berubah. Muat ulang materi.');
  }
  if (activeItemId !== item.id) {
    throw new LearningError(409, 'Jadikan item ini aktif sebelum menyimpan sesi.');
  }
  const expected = requiredEvidenceForItem(item).map((entry) => entry.id);
  const provided = input.evidence.map((entry) => entry.criterionId);
  if (new Set(provided).size !== provided.length || provided.some((id) => !expected.includes(id))) {
    throw new LearningError(422, 'Rujukan bukti tidak valid.');
  }
  if (input.kind === 'passed') {
    if (expected.some((id) => !provided.includes(id))) {
      throw new LearningError(422, 'Lengkapi bukti untuk semua target dan latihan.');
    }
  } else if (!input.evidence.length && !input.continueFrom && !input.blocker &&
    !Object.values(input.reflection ?? {}).some((value) => value.trim())) {
    throw new LearningError(422, 'Isi titik lanjut, hambatan, bukti, atau catatan sesi.');
  }
}

export function assertItemCanActivate(itemId: string, availability: readonly AvailabilityState[]): void {
  const itemState = availability.find((entry) => entry.itemId === itemId);
  if (itemState?.status === 'locked') {
    throw new LearningError(422, 'Item masih terkunci. Selesaikan: ' + itemState.missingPrerequisites.join(', ') + '.');
  }
}

export function assertReviewAllowed(
  itemId: string,
  progress: readonly ItemProgressState[],
  reviews: readonly Pick<ReviewScheduleView, 'itemId' | 'state'>[],
): void {
  if (progress.find((entry) => entry.itemId === itemId)?.status !== 'passed') {
    throw new LearningError(422, 'Review tersedia setelah materi selesai dan masih sesuai kurikulum terbaru.');
  }
  const review = reviews.find((entry) => entry.itemId === itemId);
  if (!review) throw new LearningError(422, 'Review belum terjadwal.');
  if (review.state === 'scheduled') throw new LearningError(422, 'Review belum jatuh tempo.');
  if (review.state === 'retained') {
    throw new LearningError(422, 'Semua jadwal review untuk materi ini sudah selesai.');
  }
}
