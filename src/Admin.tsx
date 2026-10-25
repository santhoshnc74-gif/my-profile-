import { useEffect, useId, useState } from 'react';
import {
  ArrowLeft,
  ArrowClockwise,
  GithubLogo,
  FloppyDisk,
  SignOut,
  Plus,
  Trash,
  ClockCounterClockwise,
  Car,
  FolderOpen,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react';
import { request } from './api';
import type { Portfolio, Profile, Session, Project } from './types';

function Field({
  label,
  value,
  onChange,
  area = false,
  type = 'text',
  max = 2500,
  hint,
  wide = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  area?: boolean;
  type?: string;
  max?: number;
  hint?: string;
  wide?: boolean;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className={`field ${wide ? 'wide' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {area ? (
        <textarea
          id={id}
          rows={label === 'Introduction' ? 4 : 3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={max}
          required={required}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={max}
          required={required}
          autoComplete="off"
        />
      )}
      {hint && <small>{hint}</small>}
    </div>
  );
}

interface HistoryItem {
  id: number;
  createdAt: number;
}

interface DiscoveredRepo {
  id: string;
  name: string;
  description: string;
  language: string;
  stars: number;
  updatedAt: string;
  htmlUrl: string;
}

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [stackText, setStackText] = useState('');
  const [retry, setRetry] = useState(0);

  // History & Overrides
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [projectOverrides, setProjectOverrides] = useState<Record<string, Partial<Project>>>({});
  const [savedOverrides, setSavedOverrides] = useState<string>('{}');
  const [discoveredRepos, setDiscoveredRepos] = useState<DiscoveredRepo[]>([]);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [savedProjectsList, setSavedProjectsList] = useState<string>('[]');

  useEffect(() => {
    document.title = 'Owner workspace · Santhosh N C';
    let live = true;
    setLoaded(false);
    setError('');

    request<Session>('/api/session')
      .then(async (status) => {
        if (!live) return;
        setSession(status);
        if (status.authenticated) {
          const profileData = await request<{ profile: Profile }>('/api/admin/profile');
          if (live) {
            setProfile(profileData.profile);
            setStackText(profileData.profile.currentWork.stack.join(', '));
            setSaved(JSON.stringify(profileData.profile));
          }

          // Fetch history and projects
          try {
            const histData = await request<{ history: HistoryItem[] }>('/api/admin/history');
            if (live) setHistoryList(histData.history || []);

            const projData = await request<{ projects: Project[]; overrides: Record<string, Partial<Project>> }>(
              '/api/admin/projects'
            );
            if (live) {
              setProjectsList(projData.projects || []);
              setSavedProjectsList(JSON.stringify((projData.projects || []).map((p) => ({ id: p.id, name: p.name }))));
              setProjectOverrides(projData.overrides || {});
              setSavedOverrides(JSON.stringify(projData.overrides || {}));
            }
          } catch {}
        }
      })
      .catch((reason) => {
        if (live) setError(reason.message);
      })
      .finally(() => {
        if (live) setLoaded(true);
      });

    return () => {
      live = false;
    };
  }, [retry]);

  const dirty =
    !!profile &&
    (JSON.stringify(profile) !== saved ||
      stackText !== profile.currentWork.stack.join(', ') ||
      JSON.stringify(projectOverrides) !== savedOverrides ||
      JSON.stringify(projectsList.map((p) => ({ id: p.id, name: p.name }))) !== savedProjectsList);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': session?.csrfToken || '' };

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const candidate: Profile = {
        ...profile,
        currentWork: {
          ...profile.currentWork,
          stack: stackText
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        },
      };

      const result = await request<{ profile: Profile }>('/api/admin/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify(candidate),
      });

      // Also save project overrides and project selections/ordering
      const projResult = await request<{ overrides: Record<string, Partial<Project>>; projects: Project[] }>('/api/admin/projects', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ overrides: projectOverrides, projects: projectsList }),
      });

      setProfile(result.profile);
      setSaved(JSON.stringify(result.profile));
      setStackText(result.profile.currentWork.stack.join(', '));
      if (projResult.overrides) {
        setProjectOverrides(projResult.overrides);
        setSavedOverrides(JSON.stringify(projResult.overrides));
      }
      if (projResult.projects) {
        setProjectsList(projResult.projects);
        setSavedProjectsList(JSON.stringify(projResult.projects.map((p) => ({ id: p.id, name: p.name }))));
      }
      setMessage('Your profile and presentation settings are saved. Portfolio is updated.');

      // Refresh history
      const histData = await request<{ history: HistoryItem[] }>('/api/admin/history');
      setHistoryList(histData.history || []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function sync() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await request<Portfolio>('/api/admin/sync', { method: 'POST', headers });
      setProjectsList(result.projects);
      setMessage(
        result.github.status === 'synced'
          ? 'GitHub project information is up to date.'
          : 'GitHub is temporarily unavailable. Your last saved project information is retained.'
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to refresh.');
    } finally {
      setBusy(false);
    }
  }

  async function discoverRepos() {
    setBusy(true);
    try {
      const res = await request<{ repos: DiscoveredRepo[] }>('/api/admin/repos', { headers });
      setDiscoveredRepos(res.repos || []);
      setMessage(`Found ${res.repos.length} public GitHub repositories.`);
    } catch {
      setError('Unable to fetch GitHub repositories at this time.');
    } finally {
      setBusy(false);
    }
  }

  async function rollback(id: number) {
    if (!window.confirm(`Restore revision from ${new Date(id).toLocaleString()}? Unsaved edits will be replaced.`))
      return;
    setBusy(true);
    setError('');
    try {
      const result = await request<{ profile: Profile }>('/api/admin/history/rollback', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id }),
      });
      setProfile(result.profile);
      setSaved(JSON.stringify(result.profile));
      setStackText(result.profile.currentWork.stack.join(', '));
      setMessage('Revision successfully restored.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Rollback failed.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (dirty && !window.confirm('Discard unsaved changes and sign out?')) return;
    setBusy(true);
    try {
      await request('/api/logout', { method: 'POST', headers });
      setProfile(null);
      setSaved('');
      setSession((previous) => ({ ...previous!, authenticated: false }));
      setMessage('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign out.');
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <div className="loading-page">Checking your session…</div>;

  if (!session?.authenticated || !profile) {
    return (
      <main className="admin-page">
        <div className="admin-topbar">
          <a href="/">
            <ArrowLeft size={18} />
            Back to portfolio
          </a>
        </div>
        <section className="admin-gate">
          <div className="brand">
            <img src="/assets/monogram.png" alt="SNC" />
          </div>
          <div className="eyebrow">OWNER WORKSPACE</div>
          <h1>Make it your own.</h1>
          <p>Manage your interactive workshop, projects, bio, and public contact information.</p>
          {error && (
            <div className="feedback error" role="alert">
              {error}
            </div>
          )}
          {!session ? (
            <button className="secondary-button" onClick={() => setRetry(retry + 1)}>
              Retry connection
            </button>
          ) : session.configured ? (
            <>
              <a href="/auth/github" className="primary-button">
                <GithubLogo size={20} />
                Sign in with GitHub
              </a>
              <p className="admin-note">Only the configured portfolio owner ID can access this workspace.</p>
            </>
          ) : (
            <>
              <p>
                Owner sign-in is locked until GitHub OAuth credentials and owner ID are provided in server environment
                variables. Public portfolio is viewable.
              </p>
              <p className="admin-note">
                Setup instructions are in the project README. No secrets should be entered here.
              </p>
            </>
          )}
        </section>
      </main>
    );
  }

  const p = profile;
  const update = (key: keyof Profile, value: unknown) => setProfile({ ...p, [key]: value });

  const carColorOptions = [
    { label: 'Deep Teal', hex: '#166069' },
    { label: 'Midnight Blue', hex: '#0f3747' },
    { label: 'Emerald Pine', hex: '#1b4a3a' },
    { label: 'Terracotta', hex: '#b34728' },
    { label: 'Slate Graphite', hex: '#263338' },
  ];

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <a href="/" target="_blank" rel="noopener noreferrer">
          <ArrowLeft size={18} />
          View portfolio
        </a>
        <div className="admin-actions">
          <button className="secondary-button" disabled={busy} onClick={sync}>
            <ArrowClockwise size={18} />
            Refresh GitHub
          </button>
          <button className="secondary-button" disabled={busy} onClick={logout}>
            <SignOut size={18} />
            Sign out
          </button>
        </div>
      </header>

      <h1>Your portfolio, up to date.</h1>
      <p className="admin-lead">
        Customize your interactive 3D workshop, project overrides, educational background and contact details. Changes
        publish immediately when you save.
      </p>

      {message && (
        <div className="feedback" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="feedback error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={save}>
        {/* PROFILE BASICS */}
        <section className="editor-section">
          <h2>Profile & Introduction</h2>
          <p>Your introduction, headline, and bio displayed in the hero section.</p>
          <div className="form-grid">
            <Field label="Name" value={p.name} onChange={(v) => update('name', v)} max={100} required />
            <Field
              label="Professional role"
              value={p.role}
              onChange={(v) => update('role', v)}
              max={180}
              required
            />
            <Field
              label="Headline"
              value={p.headline}
              onChange={(v) => update('headline', v)}
              max={200}
              area
              wide
              required
              hint="Use a new line to control the headline’s two-line layout."
            />
            <Field
              label="Biography"
              value={p.bio}
              onChange={(v) => update('bio', v)}
              max={2500}
              area
              wide
              required
            />
          </div>
        </section>

        {/* 3D WORKSHOP & CAR CUSTOMIZATION */}
        <section className="editor-section">
          <h2>
            <Car size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
            3D Workshop & Vehicle
          </h2>
          <p>Customize your drivable car color and scene behavior.</p>

          <div className="form-grid">
            <div className="field wide">
              <label>Vehicle lacquer color</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
                {carColorOptions.map((opt) => (
                  <button
                    key={opt.hex}
                    type="button"
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      backgroundColor: opt.hex,
                      border: p.appearance?.carColor === opt.hex ? '3px solid #2da6a4' : '2px solid #ccc',
                      cursor: 'pointer',
                    }}
                    title={opt.label}
                    onClick={() =>
                      update('appearance', {
                        ...(p.appearance || { carColor: '#166069', simpleViewDefault: false }),
                        carColor: opt.hex,
                      })
                    }
                  />
                ))}
                <input
                  type="text"
                  value={p.appearance?.carColor || '#166069'}
                  onChange={(e) =>
                    update('appearance', {
                      ...(p.appearance || { carColor: '#166069', simpleViewDefault: false }),
                      carColor: e.target.value,
                    })
                  }
                  maxLength={7}
                  style={{ width: '120px', marginLeft: '12px' }}
                />
              </div>
            </div>

            <div className="field wide" style={{ marginTop: '12px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  checked={Boolean(p.appearance?.simpleViewDefault)}
                  onChange={(e) =>
                    update('appearance', {
                      ...(p.appearance || { carColor: '#166069', simpleViewDefault: false }),
                      simpleViewDefault: e.target.checked,
                    })
                  }
                />
                <span>Default visitors to Simple View instead of 3D Workshop</span>
              </label>
            </div>
          </div>
        </section>

        {/* STATIONS CONFIGURATION */}
        <section className="editor-section">
          <h2>Workshop Stations</h2>
          <p>Edit titles and subtitles for the 4 physical stations in the 3D workshop.</p>

          <div className="form-grid">
            <Field
              label="Station 01 Title (Projects)"
              value={p.stations?.projects?.heading ?? 'Projects'}
              onChange={(v) =>
                update('stations', {
                  ...(p.stations || {}),
                  projects: { ...(p.stations?.projects || { subtitle: '', visible: true }), heading: v },
                })
              }
              max={100}
              required
            />
            <Field
              label="Station 01 Subtitle"
              value={p.stations?.projects?.subtitle ?? 'Garment & textile factory management system'}
              onChange={(v) =>
                update('stations', {
                  ...(p.stations || {}),
                  projects: { ...(p.stations?.projects || { heading: 'Projects', visible: true }), subtitle: v },
                })
              }
              max={200}
            />

            <Field
              label="Station 02 Title (Learning)"
              value={p.stations?.learning?.heading ?? 'Learning'}
              onChange={(v) =>
                update('stations', {
                  ...(p.stations || {}),
                  learning: { ...(p.stations?.learning || { subtitle: '', visible: true }), heading: v },
                })
              }
              max={100}
              required
            />
            <Field
              label="Station 02 Subtitle"
              value={p.stations?.learning?.subtitle ?? 'Education & technical curiosity'}
              onChange={(v) =>
                update('stations', {
                  ...(p.stations || {}),
                  learning: { ...(p.stations?.learning || { heading: 'Learning', visible: true }), subtitle: v },
                })
              }
              max={200}
            />

            <Field
              label="Station 03 Title (Future plans)"
              value={p.stations?.plans?.heading ?? 'Future plans'}
              onChange={(v) =>
                update('stations', {
                  ...(p.stations || {}),
                  plans: { ...(p.stations?.plans || { subtitle: '', visible: true }), heading: v },
                })
              }
              max={100}
              required
            />
            <Field
              label="Station 03 Subtitle"
              value={p.stations?.plans?.subtitle ?? 'Goals & entrepreneurial roadmap'}
              onChange={(v) =>
                update('stations', {
                  ...(p.stations || {}),
                  plans: { ...(p.stations?.plans || { heading: 'Future plans', visible: true }), subtitle: v },
                })
              }
              max={200}
            />

            <Field
              label="Station 04 Title (Connect)"
              value={p.stations?.connect?.heading ?? 'Connect'}
              onChange={(v) =>
                update('stations', {
                  ...(p.stations || {}),
                  connect: { ...(p.stations?.connect || { subtitle: '', visible: true }), heading: v },
                })
              }
              max={100}
              required
            />
            <Field
              label="Station 04 Subtitle"
              value={p.stations?.connect?.subtitle ?? 'Let’s start a conversation.'}
              onChange={(v) =>
                update('stations', {
                  ...(p.stations || {}),
                  connect: { ...(p.stations?.connect || { heading: 'Connect', visible: true }), subtitle: v },
                })
              }
              max={200}
            />
          </div>
        </section>

        {/* CURRENT FEATURED WORK (TEXFLOW) */}
        <section className="editor-section">
          <h2>Featured Project (TEXFLOW)</h2>
          <p>Main project displayed at Station 01 and the central machinery display.</p>
          <div className="form-grid">
            <Field
              label="Project name"
              value={p.currentWork.name}
              onChange={(v) => update('currentWork', { ...p.currentWork, name: v })}
              max={100}
              required
            />
            <Field
              label="Technologies"
              value={stackText}
              onChange={setStackText}
              max={900}
              required
              hint="Separate technologies with commas."
            />
            <Field
              label="Project description"
              value={p.currentWork.description}
              onChange={(v) => update('currentWork', { ...p.currentWork, description: v })}
              max={1500}
              area
              wide
              required
            />
          </div>
        </section>

        {/* REPOSITORIES & PROJECT OVERRIDES */}
        <section className="editor-section">
          <h2>
            <FolderOpen size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
            Project Overrides & Repositories
          </h2>
          <p>Override display names, descriptions, or hide projects without losing automatic GitHub sync stats.</p>

          <div style={{ marginBottom: '16px' }}>
            <button type="button" className="secondary-button" onClick={discoverRepos} disabled={busy}>
              <GithubLogo size={18} />
              <span>Discover Public Repositories</span>
            </button>
            <label style={{ marginLeft: '18px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={Boolean(p.autoPublish)}
                onChange={(e) => update('autoPublish', e.target.checked)}
              />
              <span>Auto-publish newly discovered public repositories</span>
            </label>
          </div>

          {projectsList.map((proj, idx) => {
            const override = projectOverrides[proj.id] || {};
            const isHidden = Boolean(override.hidden);

            return (
              <div
                key={proj.id}
                style={{
                  background: '#fcfbf8',
                  border: '1px solid #e5ded4',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '14px',
                  opacity: isHidden ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <h4>
                    {override.name || proj.name} <small style={{ color: '#888' }}>({proj.id})</small>
                    {idx === 0 && <span style={{ marginLeft: 8, fontSize: 11, background: '#164b4c', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>Primary Station 01</span>}
                  </h4>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={idx === 0}
                      onClick={() => {
                        setProjectsList((prev) => {
                          const copy = [...prev];
                          const item = copy.splice(idx, 1)[0];
                          copy.splice(idx - 1, 0, item);
                          return copy;
                        });
                      }}
                      title="Move project up in display order"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={idx === projectsList.length - 1}
                      onClick={() => {
                        setProjectsList((prev) => {
                          const copy = [...prev];
                          const item = copy.splice(idx, 1)[0];
                          copy.splice(idx + 1, 0, item);
                          return copy;
                        });
                      }}
                      title="Move project down in display order"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setProjectOverrides((prev) => ({
                          ...prev,
                          [proj.id]: { ...prev[proj.id], hidden: !isHidden },
                        }));
                      }}
                    >
                      {isHidden ? <Eye size={16} /> : <EyeSlash size={16} />}
                      <span>{isHidden ? 'Show project' : 'Hide'}</span>
                    </button>
                    {projectsList.length > 1 && proj.id.toLowerCase() !== 'texaflow' && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          if (window.confirm(`Remove ${proj.name} from selected portfolio projects?`)) {
                            setProjectsList((prev) => prev.filter((p) => p.id !== proj.id));
                          }
                        }}
                        title="Remove project"
                      >
                        <Trash size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-grid" style={{ marginTop: '10px' }}>
                  <Field
                    label="Display Title Override"
                    value={override.name || ''}
                    onChange={(v) =>
                      setProjectOverrides((prev) => ({
                        ...prev,
                        [proj.id]: { ...prev[proj.id], name: v },
                      }))
                    }
                    hint="Leave blank to use repository name."
                  />
                  <Field
                    label="Live Demo URL"
                    value={override.liveUrl || ''}
                    type="url"
                    onChange={(v) =>
                      setProjectOverrides((prev) => ({
                        ...prev,
                        [proj.id]: { ...prev[proj.id], liveUrl: v },
                      }))
                    }
                    hint="Optional https:// live link."
                  />
                  <Field
                    label="Description Override"
                    value={override.description !== undefined ? override.description : ''}
                    area
                    wide
                    onChange={(v) =>
                      setProjectOverrides((prev) => ({
                        ...prev,
                        [proj.id]: { ...prev[proj.id], description: v },
                      }))
                    }
                    hint="Leave blank to use GitHub repository description."
                  />
                </div>
              </div>
            );
          })}

          {discoveredRepos.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h3>Discovered Repositories on GitHub</h3>
              <p>Click to add any newly discovered repository to your selected projects list:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {discoveredRepos.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      if (!projectsList.some((p) => p.id === r.id)) {
                        setProjectsList((prev) => [
                          ...prev,
                          {
                            id: r.id,
                            name: r.name,
                            description: r.description,
                            stack: [r.language],
                            image: '/assets/study.png',
                            githubUrl: r.htmlUrl,
                            liveUrl: '',
                            stars: r.stars,
                            updatedAt: r.updatedAt,
                          },
                        ]);
                        setMessage(`Added ${r.name} to project list.`);
                      }
                    }}
                  >
                    <Plus size={15} />
                    <span>{r.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* EDUCATION */}
        <section id="education-editor" className="editor-section">
          <h2>Education</h2>
          <p>Edit every detail displayed in your education section.</p>
          <div className="form-grid">
            <Field
              label="Education section heading"
              value={p.education.heading}
              onChange={(v) => update('education', { ...p.education, heading: v })}
              max={100}
              required
              wide
            />
            <Field
              label="College"
              value={p.education.institution}
              onChange={(v) => update('education', { ...p.education, institution: v })}
              max={150}
              required
            />
            <Field
              label="Degree"
              value={p.education.degree}
              onChange={(v) => update('education', { ...p.education, degree: v })}
              max={180}
              required
            />
            <Field
              label="Year of study"
              value={p.education.yearOfStudy}
              onChange={(v) => update('education', { ...p.education, yearOfStudy: v })}
              max={50}
              required
            />
            <Field
              label="Graduation label"
              value={p.education.graduationLabel}
              onChange={(v) => update('education', { ...p.education, graduationLabel: v })}
              max={100}
              required
              hint="For example: Expected graduation or Graduated."
            />
            <Field
              label="Graduation year"
              type="number"
              value={String(p.education.graduationYear)}
              onChange={(v) => update('education', { ...p.education, graduationYear: Number(v) })}
              required
            />
          </div>
        </section>

        {/* FUTURE PLANS */}
        <section id="goals-editor" className="editor-section">
          <h2>Future plans</h2>
          <p>Edit, reorder, or remove goals, and add up to six. Removing every goal hides this section.</p>
          <div className="form-grid">
            <Field
              label="Future plans section heading"
              value={p.futurePlansHeading}
              onChange={(v) => update('futurePlansHeading', v)}
              max={100}
              required
              wide
            />
          </div>
          {p.goals.map((goal, index) => (
            <div className="goal-editor" key={index}>
              <Field
                label={`Goal ${index + 1}`}
                value={goal.title}
                onChange={(v) =>
                  update(
                    'goals',
                    p.goals.map((g, i) => (i === index ? { ...g, title: v } : g))
                  )
                }
                max={120}
                required
              />
              <Field
                label={`Goal ${index + 1} description`}
                value={goal.description}
                onChange={(v) =>
                  update(
                    'goals',
                    p.goals.map((g, i) => (i === index ? { ...g, description: v } : g))
                  )
                }
                area
                max={600}
                required
              />
              <div className="goal-controls">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...p.goals];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    update('goals', next);
                  }}
                  aria-label={`Move goal ${index + 1} up`}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={index === p.goals.length - 1}
                  onClick={() => {
                    const next = [...p.goals];
                    [next[index], next[index + 1]] = [next[index + 1], next[index]];
                    update('goals', next);
                  }}
                  aria-label={`Move goal ${index + 1} down`}
                >
                  Move down
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => update('goals', p.goals.filter((_, i) => i !== index))}
                  aria-label={`Remove goal ${index + 1}`}
                >
                  <Trash size={16} />
                  Remove goal
                </button>
              </div>
            </div>
          ))}
          {p.goals.length === 0 && <p className="empty-goals">No goals are displayed. Add one whenever you’re ready.</p>}
          {p.goals.length < 6 && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => update('goals', [...p.goals, { title: '', description: '' }])}
            >
              <Plus size={18} />
              Add goal
            </button>
          )}
        </section>

        {/* CONNECT & PROFILES */}
        <section className="editor-section">
          <h2>Connect & Contact Channels</h2>
          <p>
            Personalize your contact heading and verified links. Leave optional links blank to keep them hidden.
          </p>
          <div className="form-grid">
            <Field
              label="Connect heading"
              value={p.contact?.heading ?? 'Connect'}
              onChange={(v) => update('contact', { ...p.contact, heading: v })}
              max={100}
              required
            />
            <Field
              label="Connect message"
              value={p.contact?.description ?? 'Let’s start a conversation.'}
              onChange={(v) => update('contact', { ...p.contact, description: v })}
              max={400}
              required
            />
            {(['github', 'linkedin', 'website', 'resume'] as const).map((key) => (
              <Field
                key={key}
                label={
                  {
                    github: 'GitHub profile',
                    linkedin: 'LinkedIn profile',
                    website: 'Personal website',
                    resume: 'Résumé URL (optional)',
                  }[key]
                }
                value={p.links[key]}
                onChange={(v) => update('links', { ...p.links, [key]: v })}
                type="url"
                max={2048}
                hint={
                  key === 'resume'
                    ? 'Leave blank to use the printable résumé generated from your profile.'
                    : 'Use a complete https:// address.'
                }
              />
            ))}
            <Field
              label="Public email"
              value={p.links.email}
              onChange={(v) => update('links', { ...p.links, email: v })}
              type="email"
              max={254}
            />
          </div>
        </section>

        {/* MORE PROFILES */}
        <section className="editor-section">
          <h2>More Profiles</h2>
          <p>Add coding profiles, research links, or blogs.</p>
          {p.profiles.map((link, index) => (
            <div className="custom-link-row" key={index}>
              <Field
                label={`Profile ${index + 1} label`}
                value={link.label}
                onChange={(v) =>
                  update(
                    'profiles',
                    p.profiles.map((item, i) => (i === index ? { ...item, label: v } : item))
                  )
                }
                max={60}
                required
              />
              <Field
                label={`Profile ${index + 1} URL`}
                value={link.url}
                type="url"
                onChange={(v) =>
                  update(
                    'profiles',
                    p.profiles.map((item, i) => (i === index ? { ...item, url: v } : item))
                  )
                }
                max={2048}
                required
              />
              <button
                className="icon-button"
                type="button"
                onClick={() => update('profiles', p.profiles.filter((_, i) => i !== index))}
                aria-label={`Remove profile ${index + 1}`}
              >
                <Trash size={20} />
              </button>
            </div>
          ))}
          {p.profiles.length < 8 && (
            <button
              className="secondary-button"
              type="button"
              onClick={() => update('profiles', [...p.profiles, { label: '', url: '' }])}
            >
              <Plus size={18} />
              Add profile
            </button>
          )}
        </section>

        {/* VERSION HISTORY & ROLLBACK */}
        {historyList.length > 0 && (
          <section className="editor-section">
            <h2>
              <ClockCounterClockwise size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
              Revision History & Rollback
            </h2>
            <p>Roll back published content to an earlier snapshot if needed.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {historyList.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: '#fcfbf8',
                    border: '1px solid #ebe5dc',
                    borderRadius: '6px',
                  }}
                >
                  <span>
                    Revision #{item.id} · Saved on {new Date(item.createdAt).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => rollback(item.id)}
                    disabled={busy}
                  >
                    Restore this version
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SAVE BAR */}
        <div className="save-bar">
          <span>{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
          <button className="primary-button" disabled={busy || !dirty} type="submit">
            <FloppyDisk size={19} />
            {busy ? 'Please wait…' : 'Save changes'}
          </button>
        </div>
      </form>
    </main>
  );
}
