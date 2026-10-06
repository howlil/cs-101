process.env.HOST ??= '127.0.0.1';
process.env.PORT ??= '4321';
process.env.ASTRO_NODE_AUTOSTART = 'disabled';
const { startServer } = await import('../dist/server/entry.mjs');
const server = startServer();
process.once('SIGINT', () => server.server.stop());
process.once('SIGTERM', () => server.server.stop());
await server.done;
