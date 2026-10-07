import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';

const privateOrigin = process.env.CS101_ORIGIN ? new URL(process.env.CS101_ORIGIN) : undefined;

export default defineConfig({
  output: 'server',
  session: false,
  adapter: node({ mode: 'standalone' }),
  integrations: [mdx(), react()],
  server: { host: '127.0.0.1', port: 4321 },
  security: {
    allowedDomains: [
      { hostname: '127.0.0.1', protocol: 'http' },
      { hostname: 'localhost', protocol: 'http' },
      ...(privateOrigin ? [{ hostname: privateOrigin.hostname, protocol: privateOrigin.protocol.slice(0, -1), port: privateOrigin.port }] : []),
    ],
  },
  vite: { ssr: { external: ['node:sqlite'] } },
});
