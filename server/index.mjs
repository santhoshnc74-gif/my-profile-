import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { loadConfig } from './config.mjs';
import { createApp } from './app.mjs';

try {
  if (existsSync('.env')) loadEnvFile('.env');
  const config = loadConfig();
  const runtime = createApp({config});
  runtime.store.cleanup();
  const server = runtime.app.listen(config.port, config.host, () => {
    console.log(`Portfolio server listening on ${config.host}:${config.port}`);
    runtime.sync.start();
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5000;
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    runtime.sync.stop();
    server.close(() => {runtime.store.close(); process.exit(0);});
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  server.on('error', () => {console.error('Portfolio server could not start'); process.exitCode = 1; runtime.sync.stop(); runtime.store.close();});
} catch (error) {
  // Configuration error messages deliberately contain field names, never values.
  console.error(error.message.startsWith('Invalid environment') || /PUBLIC_ORIGIN|GITHUB_OWNER_ID/.test(error.message) ? error.message : 'Portfolio startup failed. Check server configuration and storage.');
  process.exitCode = 1;
}
