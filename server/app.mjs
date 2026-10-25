import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import * as oauth from 'oauth4webapi';
import { timingSafeEqual } from 'node:crypto';
import { resolve } from 'node:path';
import { profileSchema } from './profile.mjs';
import { createStore, SESSION_TTL, OAUTH_TTL } from './store.mjs';
import { createGitHubSync, readJson } from './github.mjs';

const githubServer = Object.freeze({
  issuer: 'https://github.com',
  authorization_endpoint: 'https://github.com/login/oauth/authorize',
  token_endpoint: 'https://github.com/login/oauth/access_token',
  code_challenge_methods_supported: ['S256'],
});

function cookieValue(req, name) {
  const parts = (req.headers.cookie || '').split(';').map((part) => part.trim()).filter((part) => part.startsWith(`${name}=`));
  if (parts.length !== 1) return null;
  const value = parts[0].slice(name.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}

function equal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}

export function createApp({config, store = createStore(config), fetchImpl = fetch, staticDir = resolve('dist/client')} = {}) {
  const app = express();
  const sync = createGitHubSync(config, store, fetchImpl);
  const sessionName = config.secureCookies ? '__Host-portfolio_session' : 'portfolio_session';
  const oauthName = config.secureCookies ? '__Host-portfolio_oauth' : 'portfolio_oauth';
  const cookieOptions = {httpOnly: true, secure: config.secureCookies, sameSite: 'lax', path: '/'};
  const clearCookie = (res, name) => res.clearCookie(name, cookieOptions);
  const publicPortfolio = () => {
    const {projects, syncedAt, status} = store.getSnapshot();
    const overrides = store.getProjectOverrides();
    const enrichedProjects = (projects || []).map(p => {
      const o = overrides[p.id];
      if (!o) return p;
      return {
        ...p,
        name: typeof o.name === 'string' && o.name ? o.name : p.name,
        description: typeof o.description === 'string' ? o.description : p.description,
        stack: Array.isArray(o.stack) && o.stack.length > 0 ? o.stack : p.stack,
        liveUrl: typeof o.liveUrl === 'string' ? o.liveUrl : p.liveUrl,
        hidden: Boolean(o.hidden),
      };
    }).filter(p => !p.hidden);
    return {profile: store.getProfile(), projects: enrichedProjects, github: {syncedAt, status}};
  };
  app.disable('x-powered-by');
  app.disable('etag');
  app.set('trust proxy', config.trustProxy);
  app.use(helmet({
    contentSecurityPolicy: {directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: config.production ? [] : null,
    }},
    strictTransportSecurity: config.production ? {maxAge: 31536000, includeSubDomains: false} : false,
    referrerPolicy: {policy: 'no-referrer'},
    crossOriginResourcePolicy: {policy: 'same-origin'},
  }));
  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/admin')) {
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  });

  const apiLimit = rateLimit({windowMs: 60_000, limit: 240, standardHeaders: 'draft-8', legacyHeaders: false, message: {error: 'Too many requests. Try again shortly.'}});
  const authLimit = rateLimit({windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: {error: 'Too many sign-in attempts. Try again later.'}});
  const syncLimit = rateLimit({windowMs: 60_000, limit: 2, standardHeaders: 'draft-8', legacyHeaders: false, message: {error: 'Please wait before refreshing again.'}});
  app.use('/api', apiLimit);
  app.use('/auth', authLimit);

  const allowedMethods = new Map([
    ['/api/portfolio', ['GET', 'HEAD']], ['/api/session', ['GET', 'HEAD']],
    ['/api/admin/profile', ['GET', 'HEAD', 'PUT']], ['/api/admin/sync', ['POST']],
    ['/api/admin/history', ['GET', 'HEAD']], ['/api/admin/history/rollback', ['POST']],
    ['/api/admin/projects', ['GET', 'HEAD', 'PUT']], ['/api/admin/repos', ['GET', 'HEAD']],
    ['/api/logout', ['POST']], ['/auth/github', ['GET']], ['/auth/github/callback', ['GET']],
  ]);
  app.use((req, res, next) => {
    const methods = allowedMethods.get(req.path);
    if (methods && !methods.includes(req.method)) return res.status(405).set('Allow', methods.join(', ')).json({error: 'Method not allowed'});
    next();
  });
  app.use('/api', express.json({limit: '16kb', strict: true, inflate: false}));

  function owner(req, res, next) {
    if (!config.authConfigured) return res.status(503).json({error: 'Owner sign-in is not configured'});
    const token = cookieValue(req, sessionName);
    const session = store.getSession(token, config.ownerId);
    if (!session) return res.status(401).json({error: 'Sign in as the portfolio owner'});
    req.ownerSession = session;
    req.sessionToken = token;
    next();
  }
  function csrf(req, res, next) {
    if (req.get('origin') !== config.origin || req.get('sec-fetch-site') === 'cross-site' ||
        !equal(req.get('x-csrf-token'), req.ownerSession?.csrf)) {
      return res.status(403).json({error: 'Request verification failed'});
    }
    next();
  }

  app.get('/api/portfolio', (_req, res) => res.json(publicPortfolio()));
  app.get('/api/session', (req, res) => {
    const session = config.authConfigured && store.getSession(cookieValue(req, sessionName), config.ownerId);
    res.json({authenticated: Boolean(session), configured: config.authConfigured, ...(session ? {csrfToken: session.csrf} : {})});
  });
  app.get('/api/admin/profile', owner, (_req, res) => res.json({profile: store.getProfile()}));
  app.put('/api/admin/profile', owner, csrf, (req, res) => {
    if (!req.is('application/json')) return res.status(415).json({error: 'Use application/json'});
    const result = profileSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({error: 'Check the profile fields', fields: [...new Set(result.error.issues.map((issue) => issue.path.join('.')))].slice(0, 12)});
    res.json({profile: store.setProfile(result.data)});
  });
  app.post('/api/admin/sync', owner, csrf, syncLimit, async (_req, res) => {
    await sync.sync({force: true});
    res.json(publicPortfolio());
  });
  app.get('/api/admin/history', owner, (_req, res) => res.json({history: store.getHistory()}));
  app.post('/api/admin/history/rollback', owner, csrf, (req, res) => {
    const id = Number(req.body?.id);
    if (!Number.isSafeInteger(id)) return res.status(400).json({error: 'Invalid history ID'});
    const restored = store.rollbackHistory(id);
    if (!restored) return res.status(404).json({error: 'Revision not found'});
    res.json({profile: restored});
  });
  app.get('/api/admin/projects', owner, (_req, res) => {
    const {projects} = store.getSnapshot();
    const overrides = store.getProjectOverrides();
    res.json({projects: projects || [], overrides});
  });
  app.put('/api/admin/projects', owner, csrf, (req, res) => {
    if (!req.is('application/json')) return res.status(415).json({error: 'Use application/json'});
    if (typeof req.body?.overrides !== 'object' || req.body.overrides === null) return res.status(400).json({error: 'Invalid overrides object'});
    store.setProjectOverrides(req.body.overrides);
    if (Array.isArray(req.body.projects)) {
      const validProjects = req.body.projects.filter(p => p && typeof p.id === 'string' && typeof p.name === 'string');
      store.setSelectedProjects(validProjects);
      const snap = store.getSnapshot();
      store.setSnapshot({ ...snap, projects: validProjects });
    }
    res.json({overrides: store.getProjectOverrides(), projects: store.getSnapshot().projects || []});
  });
  app.get('/api/admin/repos', owner, async (_req, res) => {
    try {
      const repos = await sync.discover();
      res.json({repos});
    } catch {
      res.json({repos: store.getDiscoveredRepos()});
    }
  });
  app.post('/api/logout', owner, csrf, (req, res) => {
    store.deleteSession(req.sessionToken);
    clearCookie(res, sessionName);
    res.json({authenticated: false});
  });

  app.get('/auth/github', async (req, res) => {
    if (!config.authConfigured) return res.status(503).json({error: 'Owner sign-in is not configured'});
    store.cleanup();
    // Invalidate an earlier login attempt in this browser before starting another.
    store.consumeOAuth(cookieValue(req, oauthName));
    const state = oauth.generateRandomState();
    const verifier = oauth.generateRandomCodeVerifier();
    const challenge = await oauth.calculatePKCECodeChallenge(verifier);
    const attempt = store.createOAuth(state, verifier);
    const redirect = new URL(githubServer.authorization_endpoint);
    redirect.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${config.origin}/auth/github/callback`,
      response_type: 'code',
      scope: '', // Basic public identity only; no private repositories or email scope.
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      allow_signup: 'false',
    }).toString();
    res.cookie(oauthName, attempt, {...cookieOptions, maxAge: OAUTH_TTL});
    res.redirect(302, redirect.href);
  });
  app.get('/auth/github/callback', async (req, res) => {
    if (!config.authConfigured) return res.status(503).json({error: 'Owner sign-in is not configured'});
    const attempt = store.consumeOAuth(cookieValue(req, oauthName));
    clearCookie(res, oauthName);
    if (!attempt) return res.status(400).json({error: 'Sign-in expired. Start again.'});
    try {
      const client = {client_id: config.clientId};
      const current = new URL(`${config.origin}/auth/github/callback`);
      current.search = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
      const params = oauth.validateAuthResponse(githubServer, client, current, attempt.state);
      const response = await oauth.authorizationCodeGrantRequest(
        githubServer, client, oauth.ClientSecretPost(config.clientSecret), params,
        `${config.origin}/auth/github/callback`, attempt.verifier,
        {
          headers: {Accept: 'application/json'},
          [oauth.customFetch]: (url, options) => fetchImpl(url, {...options, redirect: 'error', signal: AbortSignal.timeout(8000)}),
        },
      );
      const tokens = await oauth.processAuthorizationCodeResponse(githubServer, client, response);
      const identityResponse = await fetchImpl('https://api.github.com/user', {
        headers: {Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'Santhosh-Portfolio'},
        redirect: 'error', signal: AbortSignal.timeout(8000),
      });
      const identity = await readJson(identityResponse, 64 * 1024);
      // Usernames can change. Only the configured immutable numeric identity grants access.
      if (!Number.isSafeInteger(identity.id) || String(identity.id) !== config.ownerId) {
        return res.status(403).json({error: 'This account is not the portfolio owner'});
      }
      store.deleteSession(cookieValue(req, sessionName));
      const session = store.createSession(identity.id);
      res.cookie(sessionName, session.token, {...cookieOptions, maxAge: SESSION_TTL});
      // The GitHub access token is used for identity verification only, never persisted.
      res.redirect(303, '/admin');
    } catch {
      res.status(400).json({error: 'Sign-in could not be verified. Start again.'});
    }
  });

  app.use(['/api', '/auth'], (_req, res) => res.status(404).json({error: 'Not found'}));
  app.use(express.static(staticDir, {dotfiles: 'deny', index: false, fallthrough: true, etag: true, maxAge: config.production ? '1h' : 0}));
  app.get(['/', '/admin', '/resume'], (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(resolve(staticDir, 'index.html'), (error) => {if (error) next(error);});
  });
  app.use((_req, res) => res.status(404).json({error: 'Not found'}));
  app.use((error, _req, res, _next) => {
    const status = error.type === 'entity.too.large' ? 413 :
      error.type === 'encoding.unsupported' ? 415 :
      error.type === 'entity.parse.failed' ? 400 : error.status === 404 ? 404 : 500;
    if (status === 500) console.error('Portfolio request failed');
    res.status(status).json({error: status === 413 ? 'Request is too large' : status === 415 ? 'Unsupported content encoding' : status === 400 ? 'Invalid JSON body' : status === 404 ? 'Not found' : 'Something went wrong. Please try again.'});
  });
  return {app, store, sync};
}
