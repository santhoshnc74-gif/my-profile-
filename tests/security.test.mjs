import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { loadConfig } from '../server/config.mjs';
import { seedProfile, profileSchema, PROJECTS } from '../server/profile.mjs';
import { createStore, SESSION_TTL } from '../server/store.mjs';
import { createApp } from '../server/app.mjs';
import { createGitHubSync, SYNC_INTERVAL } from '../server/github.mjs';

const ownerEnv = {
  NODE_ENV: 'test', PUBLIC_ORIGIN: 'http://localhost:5173',
  GITHUB_OWNER_ID: '12345', GITHUB_CLIENT_ID: 'test-client-id',
  GITHUB_CLIENT_SECRET: 'test-client-secret-for-unit-tests-only',
};
const json = (value, status = 200) => new Response(JSON.stringify(value), {status, headers: {'Content-Type': 'application/json'}});
const cookie = (response, prefix) => response.headers.getSetCookie().find((item) => item.startsWith(`${prefix}=`))?.split(';')[0];

function fakeGitHub({ownerId = 12345, requests = [], fail = false, privateRepo = false} = {}) {
  return async (url, options = {}) => {
    requests.push({url: String(url), options});
    if (String(url) === 'https://github.com/login/oauth/access_token') {
      const body = new URLSearchParams(options.body);
      assert.equal(body.get('client_id'), ownerEnv.GITHUB_CLIENT_ID);
      assert.equal(body.get('client_secret'), ownerEnv.GITHUB_CLIENT_SECRET);
      assert.equal(body.get('grant_type'), 'authorization_code');
      assert.ok(body.get('code_verifier').length >= 43);
      return json({access_token: 'test-access-token-never-public', token_type: 'bearer', scope: ''});
    }
    if (String(url) === 'https://api.github.com/user') return json({id: ownerId, login: 'identity-can-have-any-name', email: 'private@example.test', plan: {name: 'private'}});
    if (fail) throw new Error('secret upstream failure text');
    const id = decodeURIComponent(new URL(url).pathname.split('/').at(-1));
    return json({name: id, owner: {login: 'santhoshnc74-gif'}, private: privateRepo, visibility: privateRepo ? 'private' : 'public', description: `Public ${id}`, stargazers_count: 2, updated_at: '2026-10-06T12:00:00Z', homepage: 'javascript:alert(1)', permissions: {admin: true}, privateData: 'SHOULD_NOT_APPEAR'});
  };
}

async function fixture(t, {env = ownerEnv, fetchImpl = fakeGitHub(), staticDir} = {}) {
  const config = loadConfig(env);
  const store = createStore(config, {memory: true});
  const runtime = createApp({config, store, fetchImpl, ...(staticDir ? {staticDir} : {})});
  const server = runtime.app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    runtime.sync.stop();
    await new Promise((done) => server.close(done));
    store.close();
  });
  return {...runtime, config, request: (path, options) => fetch(`${base}${path}`, {redirect: 'manual', ...options})};
}

async function login(runtime) {
  const start = await runtime.request('/auth/github');
  assert.equal(start.status, 302);
  const target = new URL(start.headers.get('location'));
  assert.equal(target.origin, 'https://github.com');
  assert.equal(target.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(target.searchParams.get('scope'), '');
  assert.equal(target.searchParams.get('redirect_uri'), `${runtime.config.origin}/auth/github/callback`);
  const prefix = runtime.config.secureCookies ? '__Host-portfolio_oauth' : 'portfolio_oauth';
  const attemptCookie = cookie(start, prefix);
  const finish = await runtime.request(`/auth/github/callback?code=test-authorization-code&state=${target.searchParams.get('state')}`, {headers: {cookie: attemptCookie}});
  return {start, target, attemptCookie, finish, sessionCookie: cookie(finish, runtime.config.secureCookies ? '__Host-portfolio_session' : 'portfolio_session')};
}

test('environment validation fails closed and never includes values in errors', () => {
  assert.equal(loadConfig({}).authConfigured, false);
  assert.throws(() => loadConfig({NODE_ENV: 'production'}), /PUBLIC_ORIGIN/);
  assert.throws(() => loadConfig({NODE_ENV: 'production', PUBLIC_ORIGIN: 'http://example.test'}), /HTTPS/);
  for (const origin of ['https://example.test/path', 'https://user:password@example.test', 'http://not-loopback.test', 'https://example.test?secret=yes']) {
    assert.throws(() => loadConfig({PUBLIC_ORIGIN: origin}));
  }
  assert.throws(() => loadConfig({GITHUB_OWNER_ID: '123'}), /configured together/);
  assert.throws(() => loadConfig({...ownerEnv, GITHUB_OWNER_ID: 'username'}), /GITHUB_OWNER_ID/);
  assert.throws(() => loadConfig({...ownerEnv, GITHUB_CLIENT_SECRET: 'do-not-show'}), (error) => !error.message.includes('do-not-show'));
  assert.throws(() => loadConfig({TRUST_PROXY: 'true'}), /TRUST_PROXY/);
  assert.equal(loadConfig({NODE_ENV: 'production', PUBLIC_ORIGIN: 'https://portfolio.example'}).secureCookies, true);
});

test('profile validator blocks dangerous URLs, unknown fields and oversized content', () => {
  const safe = seedProfile();
  assert.ok(profileSchema.safeParse(safe).success);
  for (const url of ['javascript:alert(1)', 'data:text/html,hello', '//evil.example', 'http://example.test', 'https://name:password@example.test', 'https://example.test\\@evil.test']) {
    assert.equal(profileSchema.safeParse({...safe, links: {...safe.links, website: url}}).success, false);
  }
  assert.equal(profileSchema.safeParse({...safe, bio: 'x'.repeat(2600)}).success, false);
  assert.equal(profileSchema.safeParse({...safe, isAdmin: true}).success, false);
  assert.equal(profileSchema.safeParse({...safe, profiles: [{label: 'Other', url: ''}]}).success, false);
  assert.equal(profileSchema.safeParse({...safe, links: {...safe.links, email: 'bad-email'}}).success, false);
});

test('unconfigured admin is unavailable; public profile remains usable without secrets', async (t) => {
  const runtime = await fixture(t, {env: {NODE_ENV: 'test'}});
  const session = await runtime.request('/api/session');
  assert.deepEqual(await session.json(), {authenticated: false, configured: false});
  for (const path of ['/api/admin/profile', '/auth/github']) assert.equal((await runtime.request(path)).status, 503);
  const publicResponse = await runtime.request('/api/portfolio');
  assert.equal(publicResponse.status, 200);
  const data = await publicResponse.json();
  assert.equal(data.profile.name, 'SANTHOSH N C');
  assert.equal(data.projects.length, 3);
  assert.equal(data.github.syncedAt, null);
  assert.ok(!JSON.stringify(data).includes('SECRET'));
});

test('anonymous requests cannot read or mutate owner API; methods and payload size are restricted', async (t) => {
  const runtime = await fixture(t);
  assert.equal((await runtime.request('/api/admin/profile')).status, 401);
  assert.equal((await runtime.request('/api/admin/profile', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(seedProfile())})).status, 401);
  assert.equal((await runtime.request('/api/admin/sync', {method: 'POST'})).status, 401);
  const wrongMethod = await runtime.request('/api/admin/profile', {method: 'DELETE'});
  assert.equal(wrongMethod.status, 405);
  const huge = await runtime.request('/api/admin/profile', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({bio: 'x'.repeat(20000)})});
  assert.equal(huge.status, 413);
  assert.equal((await runtime.request('/api/admin/profile', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: '{bad'})).status, 400);
});

test('OAuth verifies state, binds browser attempt and blocks replay', async (t) => {
  const requests = [];
  const runtime = await fixture(t, {fetchImpl: fakeGitHub({requests})});
  const missingCookie = await runtime.request('/auth/github/callback?code=x&state=x');
  assert.equal(missingCookie.status, 400);
  const start = await runtime.request('/auth/github');
  const attemptCookie = cookie(start, 'portfolio_oauth');
  const target = new URL(start.headers.get('location'));
  const wrongState = await runtime.request('/auth/github/callback?code=x&state=attacker-state', {headers: {cookie: attemptCookie}});
  assert.equal(wrongState.status, 400);
  assert.equal(requests.length, 0);
  const replay = await runtime.request(`/auth/github/callback?code=x&state=${target.searchParams.get('state')}`, {headers: {cookie: attemptCookie}});
  assert.equal(replay.status, 400);
  assert.equal(requests.length, 0);
});

test('OAuth denies a different numeric GitHub identity', async (t) => {
  const runtime = await fixture(t, {fetchImpl: fakeGitHub({ownerId: 99999})});
  const result = await login(runtime);
  assert.equal(result.finish.status, 403);
  assert.equal(result.sessionCookie, undefined);
});

test('owner sign-in, CSRF, safe profile editing and logout work through HTTP', async (t) => {
  const runtime = await fixture(t);
  const signedIn = await login(runtime);
  assert.equal(signedIn.finish.status, 303, await signedIn.finish.text());
  assert.equal(signedIn.finish.headers.get('location'), '/admin');
  assert.ok(signedIn.sessionCookie);
  const cookieHeader = signedIn.finish.headers.getSetCookie().find((item) => item.startsWith('portfolio_session='));
  assert.match(cookieHeader, /HttpOnly/);
  assert.match(cookieHeader, /SameSite=Lax/);
  const sessionResponse = await runtime.request('/api/session', {headers: {cookie: signedIn.sessionCookie}});
  const session = await sessionResponse.json();
  assert.equal(session.authenticated, true);
  assert.match(session.csrfToken, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(sessionResponse.headers.get('cache-control'), 'no-store');
  const validHeaders = {cookie: signedIn.sessionCookie, origin: runtime.config.origin, 'x-csrf-token': session.csrfToken, 'Content-Type': 'application/json'};
  for (const headers of [
    {...validHeaders, origin: 'https://attacker.example'},
    {...validHeaders, 'x-csrf-token': 'invalid'},
    {...validHeaders, origin: ''},
    {...validHeaders, 'sec-fetch-site': 'cross-site'},
  ]) {
    assert.equal((await runtime.request('/api/admin/profile', {method: 'PUT', headers, body: JSON.stringify(seedProfile())})).status, 403);
  }
  const unsafe = {...seedProfile(), profiles: [{label: 'Malicious', url: 'javascript:alert(1)'}]};
  assert.equal((await runtime.request('/api/admin/profile', {method: 'PUT', headers: validHeaders, body: JSON.stringify(unsafe)})).status, 400);
  const profile = {
    ...seedProfile(), bio: 'Updated owner biography.',
    education: {heading: 'Academic background', institution: 'Updated college', degree: 'B.Tech · AI & Data Science', graduationYear: 2029, graduationLabel: 'Graduating in', yearOfStudy: 'Fourth year'},
    futurePlansHeading: 'What comes next',
    goals: [
      {title: 'Build products', description: 'Turn practical problems into useful software.'},
      {title: 'Continue learning', description: 'Develop my technical and business skills.'},
      {title: 'Start a venture', description: 'Create a company with a useful product.'},
    ],
    contact: {heading: 'Get in touch', description: 'Open to collaboration.'},
    links: {...seedProfile().links, linkedin: 'https://www.linkedin.com/in/test-owner/', email: 'owner@example.org'},
    profiles: [{label: 'Research', url: 'https://example.org/research'}],
  };
  const saved = await runtime.request('/api/admin/profile', {method: 'PUT', headers: validHeaders, body: JSON.stringify(profile)});
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).profile.bio, profile.bio);
  const published = (await (await runtime.request('/api/portfolio')).json()).profile;
  assert.equal(published.bio, profile.bio);
  assert.deepEqual(published.contact, profile.contact);
  assert.deepEqual(published.links, profile.links);
  assert.deepEqual(published.profiles, profile.profiles);
  assert.deepEqual(published.education, profile.education);
  assert.equal(published.futurePlansHeading, profile.futurePlansHeading);
  assert.deepEqual(published.goals, profile.goals);
  for (const invalid of [
    {...profile, education: {...profile.education, heading: ''}},
    {...profile, education: {...profile.education, graduationLabel: 'x'.repeat(101)}},
    {...profile, education: {...profile.education, graduationYear: 2029.5}},
    {...profile, education: {...profile.education, unapprovedField: true}},
    {...profile, futurePlansHeading: '\u0000Invalid'},
    {...profile, goals: Array.from({length: 7}, () => profile.goals[0])},
    {...profile, goals: [{title: '', description: 'Incomplete goal'}]},
    {...profile, goals: [{title: 'Goal', description: 'x'.repeat(601)}]},
  ]) {
    assert.equal((await runtime.request('/api/admin/profile', {method: 'PUT', headers: validHeaders, body: JSON.stringify(invalid)})).status, 400);
  }
  assert.deepEqual((await (await runtime.request('/api/admin/profile', {headers: {cookie: signedIn.sessionCookie}})).json()).profile, profile, 'invalid changes must leave saved content unchanged');
  const withoutGoals = {...profile, goals: []};
  assert.equal((await runtime.request('/api/admin/profile', {method: 'PUT', headers: validHeaders, body: JSON.stringify(withoutGoals)})).status, 200);
  assert.deepEqual((await (await runtime.request('/api/portfolio')).json()).profile.goals, [], 'owner can remove every future plan');
  const restoredGoals = {...profile, goals: [profile.goals[2]]};
  assert.equal((await runtime.request('/api/admin/profile', {method: 'PUT', headers: validHeaders, body: JSON.stringify(restoredGoals)})).status, 200);
  assert.deepEqual((await (await runtime.request('/api/portfolio')).json()).profile.goals, restoredGoals.goals, 'owner can add a future plan again');
  assert.equal((await runtime.request('/api/logout', {method: 'POST', headers: {cookie: signedIn.sessionCookie}})).status, 403);
  assert.equal((await runtime.request('/api/logout', {method: 'POST', headers: validHeaders})).status, 200);
  assert.equal((await runtime.request('/api/admin/profile', {headers: {cookie: signedIn.sessionCookie}})).status, 401);
  const replay = await runtime.request(`/auth/github/callback?code=test&state=${signedIn.target.searchParams.get('state')}`, {headers: {cookie: signedIn.attemptCookie}});
  assert.equal(replay.status, 400);
});

test('production cookies and security headers are present and no CORS wildcard exists', async (t) => {
  const runtime = await fixture(t, {env: {...ownerEnv, NODE_ENV: 'production', PUBLIC_ORIGIN: 'https://portfolio.example'}});
  const result = await login(runtime);
  assert.equal(result.finish.status, 303);
  const setCookie = result.finish.headers.getSetCookie().find((item) => item.startsWith('__Host-portfolio_session='));
  assert.match(setCookie, /; Secure/);
  assert.match(setCookie, /; HttpOnly/);
  assert.match(setCookie, /; Path=\//);
  assert.ok(!setCookie.includes('Domain='));
  const response = await runtime.request('/api/portfolio');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('strict-transport-security'), /max-age=/);
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test('GitHub sync returns only public allowlisted fields and retains last good data on failure', async () => {
  const config = loadConfig({...ownerEnv, GITHUB_TOKEN: 'server-only-token-with-no-client-exposure'});
  const store = createStore(config, {memory: true});
  try {
    const requests = [];
    const sync = createGitHubSync(config, store, fakeGitHub({requests}));
    const success = await sync.sync({force: true});
    assert.equal(success.status, 'synced');
    assert.equal(success.projects.length, PROJECTS.length);
    assert.ok(requests.every(({url}) => url.startsWith('https://api.github.com/repos/santhoshnc74-gif/')));
    assert.ok(success.projects.every((project) => project.liveUrl === ''));
    const serialized = JSON.stringify(success);
    for (const key of ['permissions', 'SHOULD_NOT_APPEAR', config.githubToken, 'privateData']) assert.ok(!serialized.includes(key));
    await sync.sync();
    assert.equal(requests.length, PROJECTS.length, 'fresh cache should not refetch');
    const failed = await createGitHubSync(config, store, fakeGitHub({fail: true})).sync({force: true});
    assert.equal(failed.status, 'stale');
    assert.equal(failed.syncedAt, success.syncedAt);
    assert.deepEqual(failed.projects, success.projects);
    const hidden = await createGitHubSync(config, store, fakeGitHub({privateRepo: true})).sync({force: true});
    assert.equal(hidden.projects.length, 0);
  } finally {store.close();}
});

test('monitor refreshes changed GitHub data on schedule without changing owner content', async (t) => {
  t.mock.timers.enable({apis: ['Date', 'setInterval'], now: Date.now()});
  const config = loadConfig(ownerEnv);
  const store = createStore(config, {memory: true});
  let version = 1;
  const upstream = fakeGitHub();
  const sync = createGitHubSync(config, store, async (url, options) => {
    const repo = await (await upstream(url, options)).json();
    return json({...repo, description: `Revision ${version}`, language: version === 1 ? 'Python' : 'TypeScript'});
  });
  try {
    const profile = store.setProfile({...seedProfile(), bio: 'Owner-written biography'});
    sync.start();
    await sync.sync();
    assert.equal(store.getSnapshot().projects[0].description, 'Revision 1');
    version = 2;
    t.mock.timers.tick(SYNC_INTERVAL);
    await sync.sync();
    assert.equal(store.getSnapshot().projects[0].description, 'Revision 2');
    assert.deepEqual(store.getSnapshot().projects[0].stack, ['TypeScript']);
    assert.deepEqual(store.getProfile(), profile);
  } finally {sync.stop();store.close();}
});

test('GitHub rate limits delay even manual refreshes and then recover', async (t) => {
  t.mock.timers.enable({apis: ['Date'], now: Date.now()});
  const store = createStore(loadConfig(ownerEnv), {memory: true});
  let calls = 0;
  let limited = true;
  const upstream = fakeGitHub();
  const sync = createGitHubSync(loadConfig(ownerEnv), store, async (...args) => {
    calls++;
    return limited ? new Response('{}', {status: 429, headers: {'content-type':'application/json', 'retry-after':'900'}}) : upstream(...args);
  });
  try {
    await sync.sync({force:true});
    assert.equal(calls, 1);
    t.mock.timers.tick(SYNC_INTERVAL);
    await sync.sync({force:true});
    assert.equal(calls, 1);
    limited = false;
    t.mock.timers.tick(600_001);
    assert.equal((await sync.sync()).status, 'synced');
  } finally {store.close();}
});

test('sessions expire and remain tied to the configured immutable owner; profile persists', () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'portfolio-storage-test-'));
  const config = {...loadConfig(ownerEnv), dataDir};
  let store = createStore(config);
  try {
    const session = store.createSession('12345', 1000);
    assert.ok(store.getSession(session.token, '12345', 1001));
    assert.equal(store.getSession(session.token, '99999', 1001), null);
    assert.equal(store.getSession(session.token, '12345', 1000 + SESSION_TTL), null);
    const profile = {...seedProfile(), bio: 'This survives a restart.', education: {...seedProfile().education, heading: 'My education', graduationLabel: 'Completed in', graduationYear: 2030}, futurePlansHeading: 'Next steps', goals: []};
    store.setProfile(profile);
    store.close();
    store = createStore(config);
    assert.deepEqual(store.getProfile(), profile);
  } finally {store.close(); rmSync(dataDir, {recursive: true, force: true});}
});

test('stored profiles from before editable headings load with defaults and preserve owner content', () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'portfolio-legacy-profile-test-'));
  const config = {...loadConfig(ownerEnv), dataDir};
  const original = {...seedProfile(), bio: 'Owner biography before the new fields.', education: {...seedProfile().education, institution: 'Owner-edited college'}, goals: [{title: 'Original goal', description: 'Keep this owner-written plan.'}]};
  delete original.education.heading;
  delete original.education.graduationLabel;
  delete original.futurePlansHeading;
  let store = createStore(config);
  store.close();
  const db = new DatabaseSync(join(dataDir, 'portfolio.sqlite'));
  try {
    db.prepare('UPDATE content SET value = ? WHERE key = ?').run(JSON.stringify(original), 'profile');
  } finally {db.close();}
  store = createStore(config);
  try {
    const restored = store.getProfile();
    assert.deepEqual(restored, {...original, education: {...original.education, heading: 'Education', graduationLabel: 'Expected graduation'}, futurePlansHeading: 'Future plans'});
    const edited = {...restored, education: {...restored.education, heading: 'My studies', graduationLabel: 'Graduated'}, futurePlansHeading: 'My ambitions'};
    store.setProfile(edited);
    store.close();
    store = createStore(config);
    assert.deepEqual(store.getProfile(), edited, 'new defaults must never overwrite saved headings');
  } finally {store.close(); rmSync(dataDir, {recursive: true, force: true});}
});

test('history and project endpoints enforce owner authentication and CSRF', async (t) => {
  const runtime = await fixture(t);
  assert.equal((await runtime.request('/api/admin/history')).status, 401);
  assert.equal((await runtime.request('/api/admin/history/rollback', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: 1})})).status, 401);
  assert.equal((await runtime.request('/api/admin/projects')).status, 401);
  assert.equal((await runtime.request('/api/admin/projects', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({overrides: {}})})).status, 401);
  assert.equal((await runtime.request('/api/admin/repos')).status, 401);

  const signedIn = await login(runtime);
  const session = await (await runtime.request('/api/session', {headers: {cookie: signedIn.sessionCookie}})).json();
  const validHeaders = {cookie: signedIn.sessionCookie, origin: runtime.config.origin, 'x-csrf-token': session.csrfToken, 'Content-Type': 'application/json'};

  const historyRes = await runtime.request('/api/admin/history', {headers: validHeaders});
  assert.equal(historyRes.status, 200);
  const historyData = await historyRes.json();
  assert.ok(Array.isArray(historyData.history));

  const projectsRes = await runtime.request('/api/admin/projects', {headers: validHeaders});
  assert.equal(projectsRes.status, 200);

  const putOverrides = await runtime.request('/api/admin/projects', {
    method: 'PUT',
    headers: validHeaders,
    body: JSON.stringify({overrides: {TEXAFLOW: {name: 'TEXFLOW MASTER', description: 'Updated textile system'}}}),
  });
  assert.equal(putOverrides.status, 200);

  const publicPortfolio = await (await runtime.request('/api/portfolio')).json();
  const texflow = publicPortfolio.projects.find(p => p.id === 'TEXAFLOW');
  assert.equal(texflow.name, 'TEXFLOW MASTER');
});

