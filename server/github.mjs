import { PROJECTS, httpsUrl } from './profile.mjs';

export const SYNC_INTERVAL = 5 * 60 * 1000;

export async function readJson(response, limit = 256 * 1024) {
  if (!response.ok || !response.headers.get('content-type')?.includes('json')) throw new Error('Upstream request failed');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty upstream response');
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) throw new Error('Upstream response too large');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function createGitHubSync(config, store, fetchImpl = fetch) {
  let running = null;
  let timer = null;
  let lastAttempt = 0;
  let retryAt = 0;
  let failures = 0;
  async function update() {
    const previous = store.getSnapshot();
    const projects = [];
    try {
      const selected = store.getSelectedProjects();
      const baseList = Array.isArray(selected) && selected.length > 0 ? selected : PROJECTS;

      // These paths come from fixed configuration and a fixed repository allowlist,
      // never owner-editable profile URLs or request input.
      for (const curated of baseList) {
        const repoId = curated.id;
        const url = `https://api.github.com/repos/${encodeURIComponent(config.githubUsername)}/${encodeURIComponent(repoId)}`;
        const response = await fetchImpl(url, {
          headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Santhosh-Portfolio',
            ...(config.githubToken ? {Authorization: `Bearer ${config.githubToken}`} : {}),
          },
          redirect: 'error',
          signal: AbortSignal.timeout(8000),
        });
        if (response.status === 403 || response.status === 429) {
          const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000;
          const retry = Number(response.headers.get('retry-after')) * 1000;
          retryAt = Math.max(Date.now() + SYNC_INTERVAL, Number.isFinite(reset) ? reset : 0, Date.now() + (Number.isFinite(retry) ? retry : 0));
        }
        // An authoritative removal/access change removes the cached card.
        if (response.status === 404) continue;
        const repo = await readJson(response);
        if (repo.private !== false || repo.visibility && repo.visibility !== 'public') continue;
        if (typeof repo.name !== 'string' || repo.name.toLowerCase() !== repoId.toLowerCase() ||
            typeof repo.owner?.login !== 'string' || repo.owner.login.toLowerCase() !== config.githubUsername.toLowerCase()) {
          throw new Error('Unexpected repository identity');
        }
        const description = typeof repo.description === 'string' && repo.description.trim() ? repo.description.slice(0, 700) : (curated.description || '');
        const homepage = typeof repo.homepage === 'string' ? repo.homepage : '';
        projects.push({
          ...curated,
          description,
          stack: typeof repo.language === 'string' && /^[\w+#. -]{1,40}$/.test(repo.language) ? [repo.language] : (curated.stack || ['Code']),
          githubUrl: `https://github.com/${config.githubUsername}/${repoId}`,
          liveUrl: httpsUrl.safeParse(homepage).success ? homepage : (curated.liveUrl || ''),
          stars: Number.isSafeInteger(repo.stargazers_count) && repo.stargazers_count >= 0 ? repo.stargazers_count : 0,
          updatedAt: typeof repo.updated_at === 'string' && !Number.isNaN(Date.parse(repo.updated_at)) ? new Date(repo.updated_at).toISOString() : null,
        });
      }

      // If autoPublish is enabled, discover and append any new public repos
      const profile = store.getProfile();
      if (profile?.autoPublish) {
        try {
          const discovered = await discover();
          for (const d of discovered) {
            if (!projects.some(p => p.id.toLowerCase() === d.id.toLowerCase())) {
              projects.push({
                id: d.id,
                name: d.name,
                description: d.description || '',
                stack: d.language ? [d.language] : ['Code'],
                image: '/assets/study.png',
                githubUrl: d.htmlUrl,
                liveUrl: '',
                stars: d.stars,
                updatedAt: d.updatedAt,
              });
            }
          }
        } catch {}
      }

      const next = {projects, syncedAt: new Date().toISOString(), status: 'synced'};
      store.setSnapshot(next);
      failures = 0;
      retryAt = 0;
      return next;
    } catch {
      failures++;
      retryAt = Math.max(retryAt, Date.now() + Math.min(SYNC_INTERVAL * 2 ** (failures - 1), 60 * 60 * 1000));
      // Never expose upstream response bodies, tokens, or private fields.
      const fallback = {...previous, status: previous.syncedAt ? 'stale' : 'unavailable'};
      store.setSnapshot(fallback);
      return fallback;
    }
  }
  function sync({force = false} = {}) {
    if (running) return running;
    if (Date.now() < retryAt) return Promise.resolve(store.getSnapshot());
    if (!force && Date.now() - lastAttempt < SYNC_INTERVAL) return Promise.resolve(store.getSnapshot());
    lastAttempt = Date.now();
    running = update().finally(() => {running = null;});
    return running;
  }
  async function discover() {
    try {
      const url = `https://api.github.com/users/${encodeURIComponent(config.githubUsername)}/repos?per_page=30&sort=updated&type=public`;
      const response = await fetchImpl(url, {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Santhosh-Portfolio',
          ...(config.githubToken ? {Authorization: `Bearer ${config.githubToken}`} : {}),
        },
        redirect: 'error',
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return store.getDiscoveredRepos();
      const repos = await readJson(response);
      if (!Array.isArray(repos)) return store.getDiscoveredRepos();
      const discovered = repos
        .filter(r => r.private === false && (!r.visibility || r.visibility === 'public') && r.owner?.login?.toLowerCase() === config.githubUsername.toLowerCase())
        .map(r => ({
          id: r.name,
          name: r.name,
          description: typeof r.description === 'string' ? r.description.slice(0, 700) : '',
          language: typeof r.language === 'string' ? r.language : 'Code',
          stars: Number.isSafeInteger(r.stargazers_count) ? r.stargazers_count : 0,
          updatedAt: r.updated_at,
          htmlUrl: r.html_url,
        }));
      store.setDiscoveredRepos(discovered);
      return discovered;
    } catch {
      return store.getDiscoveredRepos();
    }
  }
  return {
    sync,
    discover,
    start() {
      if (timer) return;
      void sync();
      timer = setInterval(() => {store.cleanup(); void sync();}, SYNC_INTERVAL);
      timer.unref();
    },
    stop() {if (timer) clearInterval(timer); timer = null;},
  };
}
