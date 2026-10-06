import type { APIRoute } from 'astro';
import { learning } from '../../server/runtime';
import { json } from '../../server/http';
export const GET: APIRoute = async () => json((await learning()).snapshot());
