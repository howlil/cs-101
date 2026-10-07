import { reviewBankSchema, type ReviewBank } from '../domain/review/schema';

const modules = import.meta.glob('../../review-banks/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

const banks = new Map<string, ReviewBank>();

for (const [path, source] of Object.entries(modules)) {
  const bank = reviewBankSchema.parse(source);
  if (banks.has(bank.itemId)) {
    throw new Error(`Review bank duplikat untuk ${bank.itemId}: ${path}`);
  }
  banks.set(bank.itemId, bank);
}

export function reviewBankFor(itemId: string) {
  return banks.get(itemId);
}
