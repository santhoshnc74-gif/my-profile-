import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { profileSchema, seedProfile, seedProjects } from './profile.mjs';

export const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
export const randomToken = () => randomBytes(32).toString('base64url');
export const SESSION_TTL = 12 * 60 * 60 * 1000;
export const OAUTH_TTL = 10 * 60 * 1000;

export function createStore({dataDir, githubUsername}, {memory = false} = {}) {
  if (!memory) mkdirSync(dataDir, {recursive: true, mode: 0o700});
  const filename = memory ? ':memory:' : join(dataDir, 'portfolio.sqlite');
  const db = new DatabaseSync(filename);
  if (!memory && process.platform !== 'win32') chmodSync(filename, 0o600);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS content (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS profile_history (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, owner_id TEXT NOT NULL, csrf TEXT NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS oauth_attempts (hash TEXT PRIMARY KEY, state TEXT NOT NULL, verifier TEXT NOT NULL, expires_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS oauth_expiry ON oauth_attempts(expires_at);
    CREATE INDEX IF NOT EXISTS profile_history_created ON profile_history(created_at);
  `);
  const read = db.prepare('SELECT value FROM content WHERE key = ?');
  const write = db.prepare('INSERT INTO content(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  const get = (key) => {const row = read.get(key); return row ? JSON.parse(row.value) : null;};
  const set = (key, value) => write.run(key, JSON.stringify(value));
  if (!get('profile')) set('profile', seedProfile(githubUsername));
  if (!get('snapshot')) set('snapshot', {projects: seedProjects(githubUsername), syncedAt: null, status: 'not_synced'});
  // Correct only untouched prototype defaults; never overwrite an owner's edits.
  if (!get('content_version')) {
    const profile = get('profile');
    const seed = seedProfile(githubUsername);
    if (profile.bio === 'I am a third-year B.Tech student in Artificial Intelligence & Data Science at Excel Engineering College, expecting to graduate in 2028. I learn by studying, experimenting, and building projects that connect technology with everyday needs.') profile.bio = seed.bio;
    if (profile.currentWork.description === 'A garment and textile factory management application that brings workforce attendance, orders, and production into one place.') profile.currentWork.description = seed.currentWork.description;
    set('profile', profileSchema.parse(profile));
    const snapshot = get('snapshot');
    const seeds = seedProjects(githubUsername);
    snapshot.projects = snapshot.projects.map(project => {
      const next = seeds.find(item => item.id === project.id);
      return next ? {...project, name: next.name, description: project.description.startsWith('An exploration of SQL') || project.description.startsWith('A study assistant project') ? '' : project.description, stack: next.stack} : project;
    });
    set('snapshot', snapshot);
    set('content_version', 1);
  }
  return {
    getProfile: () => profileSchema.parse(get('profile')),
    setProfile(profile) {
      const safe = profileSchema.parse(profile);
      set('profile', safe);
      try {
        db.prepare('INSERT INTO profile_history(created_at, value) VALUES(?, ?)').run(Date.now(), JSON.stringify(safe));
        db.prepare('DELETE FROM profile_history WHERE id NOT IN (SELECT id FROM profile_history ORDER BY id DESC LIMIT 20)').run();
      } catch {}
      return safe;
    },
    getHistory() {
      try {
        return db.prepare('SELECT id, created_at as createdAt FROM profile_history ORDER BY id DESC LIMIT 15').all();
      } catch { return []; }
    },
    rollbackHistory(id) {
      const row = db.prepare('SELECT value FROM profile_history WHERE id = ?').get(id);
      if (!row) return null;
      const safe = profileSchema.parse(JSON.parse(row.value));
      set('profile', safe);
      return safe;
    },
    getProjectOverrides: () => get('project_overrides') || {},
    setProjectOverrides: (overrides) => { set('project_overrides', overrides); return overrides; },
    getSelectedProjects: () => get('selected_projects'),
    setSelectedProjects: (projects) => { set('selected_projects', projects); return projects; },
    getDiscoveredRepos: () => get('discovered_repos') || [],
    setDiscoveredRepos: (repos) => { set('discovered_repos', repos); return repos; },
    getSnapshot: () => {
      const snap = get('snapshot') || {};
      const selected = get('selected_projects');
      if (Array.isArray(selected) && selected.length > 0) {
        return { ...snap, projects: selected };
      }
      return snap;
    },
    setSnapshot: (snapshot) => {
      set('snapshot', snapshot);
      if (Array.isArray(snapshot?.projects)) {
        set('selected_projects', snapshot.projects);
      }
    },
    createSession(ownerId, now = Date.now()) {
      const token = randomToken();
      const csrf = randomToken();
      const expiresAt = now + SESSION_TTL;
      db.prepare('INSERT INTO sessions VALUES(?, ?, ?, ?)').run(tokenHash(token), String(ownerId), csrf, expiresAt);
      // Bound the number of concurrent owner sessions, newest first.
      db.prepare('DELETE FROM sessions WHERE hash NOT IN (SELECT hash FROM sessions ORDER BY expires_at DESC LIMIT 10)').run();
      return {token, csrf, expiresAt};
    },
    getSession(token, ownerId, now = Date.now()) {
      if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
      const record = db.prepare('SELECT owner_id, csrf, expires_at FROM sessions WHERE hash = ?').get(tokenHash(token));
      if (!record || record.owner_id !== String(ownerId) || record.expires_at <= now) return null;
      return record;
    },
    deleteSession(token) {if (token) db.prepare('DELETE FROM sessions WHERE hash = ?').run(tokenHash(token));},
    createOAuth(state, verifier, now = Date.now()) {
      const token = randomToken();
      db.prepare('INSERT INTO oauth_attempts VALUES(?, ?, ?, ?)').run(tokenHash(token), state, verifier, now + OAUTH_TTL);
      return token;
    },
    consumeOAuth(token, now = Date.now()) {
      if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
      // DELETE ... RETURNING makes a pending attempt single use across processes.
      const value = db.prepare('DELETE FROM oauth_attempts WHERE hash = ? RETURNING state, verifier, expires_at').get(tokenHash(token));
      return value && value.expires_at > now ? value : null;
    },
    cleanup(now = Date.now()) {
      db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
      db.prepare('DELETE FROM oauth_attempts WHERE expires_at <= ?').run(now);
    },
    close: () => db.close(),
  };
}
