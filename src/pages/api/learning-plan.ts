import type { APIRoute } from 'astro';
import { curriculumGraph } from '../../server/curriculum';
import { learning } from '../../server/runtime';
import { json } from '../../server/http';
export const GET: APIRoute = async ({ url }) => {
  const itemId = url.searchParams.get('itemId') ?? '';
  if (!curriculumGraph.itemsById.has(itemId)) return json({ error: 'Materi tidak ditemukan.' }, 404);
  return json(await (await learning()).assessmentPlan(itemId));
};
