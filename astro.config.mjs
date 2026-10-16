import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';

const privateOrigin = process.env.CS101_ORIGIN ? new URL(process.env.CS101_ORIGIN) : undefined;

export default defineConfig({
  output: 'server',
  // Content pages are read-only, with no learner state or database access.
  prefetch: false,
  session: false,
  adapter: cloudflare({ imageService: 'passthrough' }),
  integrations: [mdx(), react()],
  security: {
    allowedDomains: [
      { hostname: '127.0.0.1', protocol: 'http' },
      { hostname: 'localhost', protocol: 'http' },
      ...(privateOrigin ? [{ hostname: privateOrigin.hostname, protocol: privateOrigin.protocol.slice(0, -1), port: privateOrigin.port }] : []),
    ],
  },
});
