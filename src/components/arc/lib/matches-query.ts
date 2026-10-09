// Shared token matching for generic Arc search and CS-101 curriculum explorer.
// Keep this UI-only utility independent from curriculum domain ownership.
export function matchesQuery(haystack: string, rawQuery: string): boolean {
  const terms = rawQuery.trim().toLocaleLowerCase('id-ID').split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const text = haystack.toLocaleLowerCase('id-ID');
  return terms.every((term) => text.includes(term));
}
