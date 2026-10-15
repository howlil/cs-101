import type { APIRoute } from 'astro';
import { learning } from '../../server/runtime';
import { assessedItemIds } from '../../server/assessment-bank';
import { selectMicroRecallQueue } from '../../domain/review/budget';
import { json } from '../../server/http';

export const GET: APIRoute = async () => {
  const service = await learning();
  const plans = await Promise.all(assessedItemIds().map((id) => service.assessmentPlan(id)));
  return json({ items: selectMicroRecallQueue(plans), maxQuestions: 3 });
};
