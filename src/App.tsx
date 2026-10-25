import { useEffect, useState, lazy, Suspense } from 'react';
import { ArrowLeft, Printer } from '@phosphor-icons/react';
import { initialPortfolio } from './data';
import { request, safeUrl } from './api';
import type { Portfolio } from './types';
import { WorkshopView } from './workshop/WorkshopView';
import { SimpleView } from './workshop/SimpleView';

const Admin = lazy(() => import('./Admin'));

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

function Resume({ data }: { data: Portfolio }) {
  const { profile: p, projects } = data;
  useEffect(() => {
    document.title = 'Résumé · Santhosh N C';
  }, []);

  return (
    <div className="resume-page">
      <div className="resume-toolbar">
        <a href="/">
          <ArrowLeft />
          Back to portfolio
        </a>
        <button className="primary-button" onClick={() => window.print()}>
          <Printer />
          Print / save PDF
        </button>
      </div>

      <article className="resume-sheet">
        <header>
          <h1>{p.name}</h1>
          <p>{p.role}</p>
          {safeUrl(p.links.github) && (
            <a href={safeUrl(p.links.github)!} target="_blank" rel="noopener noreferrer">
              {p.links.github}
            </a>
          )}
          {p.links.email && <p>{p.links.email}</p>}
        </header>

        <section>
          <h2>Profile</h2>
          <p>{p.bio}</p>
        </section>

        <section>
          <h2>{p.education.heading}</h2>
          <h3>{p.education.degree}</h3>
          <p>{p.education.institution}</p>
          <p>
            {p.education.yearOfStudy} · {p.education.graduationLabel} {p.education.graduationYear}
          </p>
        </section>

        <section>
          <h2>Current project</h2>
          <h3>{p.currentWork.name}</h3>
          <p>{p.currentWork.description}</p>
          <p>{p.currentWork.stack.join(' · ')}</p>
        </section>

        <section>
          <h2>Selected work</h2>
          {projects.map((project) => (
            <div className="resume-project" key={project.id}>
              <h3>{project.name}</h3>
              <p>{project.description || project.stack.join(' · ')}</p>
              {safeUrl(project.githubUrl) && (
                <a href={safeUrl(project.githubUrl)!} target="_blank" rel="noopener noreferrer">
                  {project.githubUrl}
                </a>
              )}
            </div>
          ))}
        </section>

        {p.goals.length > 0 && (
          <section>
            <h2>{p.futurePlansHeading}</h2>
            {p.goals.map((goal, i) => (
              <p key={i}>
                <strong>{goal.title}.</strong> {goal.description}
              </p>
            ))}
          </section>
        )}
      </article>
    </div>
  );
}

export function App() {
  const [data, setData] = useState<Portfolio>(initialPortfolio);
  const [offline, setOffline] = useState(false);

  // Simple View toggle state
  const [isSimpleView, setIsSimpleView] = useState<boolean>(() => {
    if (new URLSearchParams(window.location.search).get('view') === 'simple') return true;
    if (!hasWebGL()) return true;
    const saved = localStorage.getItem('snc_simple_view');
    if (saved !== null) return saved === 'true';
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    return false;
  });

  const toggleSimpleView = () => {
    setIsSimpleView((prev) => {
      const next = !prev;
      localStorage.setItem('snc_simple_view', next ? 'true' : 'false');
      return next;
    });
  };

  // Live Portfolio data sync
  useEffect(() => {
    let live = true;
    let pending = false;

    const refresh = async () => {
      if (pending || document.visibilityState === 'hidden') return;
      pending = true;
      try {
        const value = await request<Portfolio>('/api/portfolio');
        if (live) {
          setData((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(value)) return prev;
            return value;
          });
          setOffline(false);
          document.title = `${value.profile.name} · Interactive 3D Portfolio`;
        }
      } catch {
        if (live) setOffline(true);
      } finally {
        pending = false;
      }
    };

    void refresh();
    const timer = window.setInterval(refresh, 25_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('online', refresh);

    return () => {
      live = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('online', refresh);
    };
  }, []);

  // Admin and Resume Routes
  if (location.pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={<div className="loading-page">Loading owner workspace…</div>}>
        <Admin />
      </Suspense>
    );
  }

  if (location.pathname === '/resume') {
    return <Resume data={data} />;
  }

  return isSimpleView ? (
    <SimpleView portfolio={data} onToggleSimpleView={toggleSimpleView} />
  ) : (
    <WorkshopView
      portfolio={data}
      onToggleSimpleView={toggleSimpleView}
      isSimpleView={false}
    />
  );
}
