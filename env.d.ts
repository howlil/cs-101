/// <reference types="astro/client" />

type CloudflareBindings = { LEARNING_DB?: import('./src/server/learning/d1').D1Database };

declare module 'cloudflare:workers' {
  export const env: CloudflareBindings;
}
