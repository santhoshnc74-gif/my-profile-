import { resolve } from 'node:path';
import { z } from 'zod';

const optional = (value) => value === undefined || value === '' ? undefined : value;
const settings = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.enum(['127.0.0.1', '0.0.0.0', '::1']).default('127.0.0.1'),
  PUBLIC_ORIGIN: z.string().url().optional(),
  DATA_DIR: z.string().min(1).max(4096).default('./data'),
  TRUST_PROXY: z.enum(['none', 'loopback']).default('none'),
  GITHUB_USERNAME: z.string().regex(/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i).default('santhoshnc74-gif'),
  GITHUB_OWNER_ID: z.string().regex(/^[1-9]\d{0,19}$/).optional(),
  GITHUB_CLIENT_ID: z.string().min(5).max(200).regex(/^[\w.-]+$/).optional(),
  GITHUB_CLIENT_SECRET: z.string().min(20).max(512).regex(/^[\x21-\x7e]+$/).optional(),
  GITHUB_TOKEN: z.string().min(20).max(512).regex(/^[\x21-\x7e]+$/).optional(),
});

export function loadConfig(env = process.env) {
  const selected = Object.fromEntries(Object.keys(settings.shape).map((key) => [key, optional(env[key])]));
  const parsed = settings.safeParse(selected);
  if (!parsed.success) {
    // Values can contain credentials, so report names only.
    throw new Error(`Invalid environment settings: ${[...new Set(parsed.error.issues.map((issue) => issue.path[0]))].join(', ')}`);
  }
  const value = parsed.data;
  const production = value.NODE_ENV === 'production';
  if (production && !value.PUBLIC_ORIGIN) throw new Error('PUBLIC_ORIGIN is required in production');
  const url = new URL(value.PUBLIC_ORIGIN || 'http://localhost:5173');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      (production ? url.protocol !== 'https:' : !['https:', 'http:'].includes(url.protocol)) ||
      (!production && url.protocol === 'http:' && !local)) {
    throw new Error('PUBLIC_ORIGIN must be an HTTPS origin; local development may use loopback HTTP');
  }
  const authValues = [value.GITHUB_OWNER_ID, value.GITHUB_CLIENT_ID, value.GITHUB_CLIENT_SECRET];
  if (authValues.some(Boolean) && !authValues.every(Boolean)) {
    throw new Error('GITHUB_OWNER_ID, GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be configured together');
  }
  return Object.freeze({
    production,
    port: value.PORT,
    host: value.HOST,
    origin: url.origin,
    dataDir: resolve(value.DATA_DIR),
    trustProxy: value.TRUST_PROXY === 'loopback' ? 'loopback' : false,
    githubUsername: value.GITHUB_USERNAME,
    ownerId: value.GITHUB_OWNER_ID,
    clientId: value.GITHUB_CLIENT_ID,
    clientSecret: value.GITHUB_CLIENT_SECRET,
    githubToken: value.GITHUB_TOKEN,
    authConfigured: authValues.every(Boolean),
    secureCookies: url.protocol === 'https:',
  });
}
