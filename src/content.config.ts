import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

export const collections = {
  lessons: defineCollection({
    loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }),
    schema: z.object({
      taskId: z.string(), title: z.string(), description: z.string(),
      demo: z.boolean().default(false),
      curriculumFingerprint: z.string().optional(),
    }),
  }),
};
