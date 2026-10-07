import type { APIRoute } from 'astro';
import { learning } from '../../server/runtime';
import { mutation } from '../../server/http';

export const POST: APIRoute = ({ request }) =>
  mutation(request, async (body) => (await learning()).submitReview(body));
