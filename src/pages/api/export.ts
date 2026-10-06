import type { APIRoute } from 'astro';
import { learning } from '../../server/runtime';
import { json } from '../../server/http';
export const GET: APIRoute = async () => {
  const response = json(await (await learning()).export());
  response.headers.set('Content-Disposition', 'attachment; filename="cs-101-progress.json"');
  return response;
};
