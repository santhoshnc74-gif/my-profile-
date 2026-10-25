// Accessible modal drawer for the 4 workshop stations
import { useEffect, useRef, useState } from 'react';
import { X, ArrowUpRight, GithubLogo, Star, GitFork, BookOpen, GraduationCap, Compass, Envelope, Globe, LinkedinLogo } from '@phosphor-icons/react';
import type { Portfolio, Project } from '../types';
import { safeUrl } from '../api';

interface StationModalProps {
  stationId: 'projects' | 'learning' | 'plans' | 'connect' | null;
  portfolio: Portfolio;
  onClose: () => void;
}

export function StationModal({ stationId, portfolio, onClose }: StationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const { profile: p, projects, github } = portfolio;
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => projects[0]?.id || 'TEXAFLOW');

  // Accessible focus trap, Escape dismiss, and focus restoration
  useEffect(() => {
    if (!stationId) return;

    triggerRef.current = document.activeElement as HTMLElement | null;

    const timer = setTimeout(() => {
      const closeBtn = modalRef.current?.querySelector<HTMLButtonElement>('.station-modal-close');
      closeBtn?.focus();
    }, 30);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [stationId, onClose]);

  if (!stationId) return null;

  const stationsConfig = p.stations || {
    projects: { heading: 'Projects', subtitle: 'Featured engineering & software projects', visible: true },
    learning: { heading: 'Learning', subtitle: 'Education & technical curiosity', visible: true },
    plans: { heading: 'Future plans', subtitle: 'Goals & entrepreneurial roadmap', visible: true },
    connect: { heading: 'Connect', subtitle: 'Let’s start a conversation.', visible: true },
  };

  const currentProject = projects.find((proj) => proj.id === selectedProjectId) || projects[0];

  return (
    <div
      className="station-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="station-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="station-modal-container" ref={modalRef}>
        <header className="station-modal-header">
          <div className="station-header-badge">
            <span className="station-number">
              {stationId === 'projects' ? '01' : stationId === 'learning' ? '02' : stationId === 'plans' ? '03' : '04'}
            </span>
            <span className="station-category">WORKSHOP STATION</span>
          </div>
          <button
            className="station-modal-close"
            onClick={onClose}
            aria-label="Close station details"
          >
            <X size={22} />
          </button>
        </header>

        <div className="station-modal-body">
          {/* STATION 01: PROJECTS */}
          {stationId === 'projects' && (
            <div className="station-content">
              <div className="station-intro">
                <h2 id="station-modal-title">{stationsConfig.projects.heading}</h2>
                <p className="station-subtitle">
                  {stationsConfig.projects.subtitle || 'Featured engineering & software projects'}
                </p>
              </div>

              {/* Projects Navigation Tabs */}
              <div className="project-tabs" role="tablist">
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    role="tab"
                    aria-selected={currentProject?.id === proj.id}
                    className={`project-tab-btn ${currentProject?.id === proj.id ? 'active' : ''}`}
                    onClick={() => setSelectedProjectId(proj.id)}
                  >
                    <span>{proj.name}</span>
                    {proj.id.toLowerCase() === 'texaflow' && <span className="tab-pill">Featured</span>}
                  </button>
                ))}
              </div>

              {/* Selected Project Card */}
              {currentProject && (
                <div className="project-feature-card">
                  <div className="project-card-header">
                    <div>
                      <span className="status-badge">
                        {currentProject.id.toLowerCase() === 'texaflow' ? 'In development' : 'Active'}
                      </span>
                      <h3>{currentProject.name}</h3>
                    </div>
                    {currentProject.stars !== null && (
                      <div className="project-stars">
                        <Star size={16} weight="fill" />
                        <span>{currentProject.stars} stars</span>
                      </div>
                    )}
                  </div>

                  <p className="project-desc">
                    {currentProject.description ||
                      (currentProject.id.toLowerCase() === 'texaflow'
                        ? p.currentWork.description
                        : currentProject.id === 'aids-study-assistant'
                        ? 'Interactive study assistant and resource organizer for AI & Data Science coursework.'
                        : currentProject.id === 'scaler-openenv-sql-tuner'
                        ? 'SQL query optimization and tuning experiments environment.'
                        : 'Explore repository source code and commits on GitHub.')}
                  </p>

                  <div className="project-tech-stack">
                    <span className="stack-label">Technologies:</span>
                    <div className="stack-tags">
                      {(currentProject.id.toLowerCase() === 'texaflow'
                        ? p.currentWork.stack
                        : currentProject.stack
                      ).map((tech) => (
                        <span key={tech} className="tech-tag">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="project-links-row">
                    {safeUrl(currentProject.githubUrl) && (
                      <a
                        href={safeUrl(currentProject.githubUrl)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="primary-button"
                      >
                        <GithubLogo size={18} />
                        <span>View Repository</span>
                        <ArrowUpRight size={15} />
                      </a>
                    )}
                    {safeUrl(currentProject.liveUrl) && (
                      <a
                        href={safeUrl(currentProject.liveUrl)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="secondary-button"
                      >
                        <Globe size={18} />
                        <span>Live Demo</span>
                        <ArrowUpRight size={15} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* GitHub Sync Status Note */}
              <div className="github-sync-footnote">
                <p>
                  {github.status === 'synced'
                    ? 'GitHub project metadata updates automatically every 5 minutes.'
                    : 'Showing saved project snapshot.'}
                  {github.syncedAt && (
                    <>
                      {' '}
                      Last synced:{' '}
                      <time dateTime={github.syncedAt}>
                        {new Date(github.syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </time>
                      .
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* STATION 02: LEARNING */}
          {stationId === 'learning' && (
            <div className="station-content">
              <div className="station-intro">
                <h2 id="station-modal-title">{stationsConfig.learning.heading}</h2>
                <p className="station-subtitle">{stationsConfig.learning.subtitle}</p>
              </div>

              <div className="learning-card">
                <div className="learning-icon-box">
                  <GraduationCap size={32} weight="duotone" />
                </div>
                <div className="learning-info">
                  <h3>{p.education.degree}</h3>
                  <p className="institution-name">{p.education.institution}</p>
                  <p className="graduation-meta">
                    {p.education.yearOfStudy} · {p.education.graduationLabel} {p.education.graduationYear}
                  </p>
                </div>
              </div>

              <div className="learning-narrative">
                <h4>Focus & Study Interests</h4>
                <p>{p.bio}</p>
                <div className="focus-areas">
                  <div className="focus-item">
                    <BookOpen size={20} />
                    <span>Artificial Intelligence & Neural Architectures</span>
                  </div>
                  <div className="focus-item">
                    <Compass size={20} />
                    <span>Data Engineering & SQL Performance Optimization</span>
                  </div>
                  <div className="focus-item">
                    <GitFork size={20} />
                    <span>Production Web Backends with Python & FastAPI</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STATION 03: FUTURE PLANS */}
          {stationId === 'plans' && (
            <div className="station-content">
              <div className="station-intro">
                <h2 id="station-modal-title">{stationsConfig.plans.heading}</h2>
                <p className="station-subtitle">{stationsConfig.plans.subtitle}</p>
              </div>

              <div className="goals-timeline">
                {p.goals.map((goal, idx) => (
                  <div key={idx} className="goal-timeline-item">
                    <div className="goal-marker">{idx + 1}</div>
                    <div className="goal-body">
                      <h3>{goal.title}</h3>
                      <p>{goal.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="plans-quote-box">
                <p>“Turning practical problems into usable, reliable software.”</p>
              </div>
            </div>
          )}

          {/* STATION 04: CONNECT */}
          {stationId === 'connect' && (
            <div className="station-content">
              <div className="station-intro">
                <h2 id="station-modal-title">{stationsConfig.connect.heading}</h2>
                <p className="station-subtitle">{p.contact?.description || stationsConfig.connect.subtitle}</p>
              </div>

              <div className="connect-grid">
                {safeUrl(p.links.github) && (
                  <a
                    href={safeUrl(p.links.github)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="connect-link-card"
                  >
                    <div className="connect-card-icon">
                      <GithubLogo size={24} weight="fill" />
                    </div>
                    <div className="connect-card-text">
                      <span className="connect-card-label">GitHub</span>
                      <span className="connect-card-val">santhoshnc74-gif</span>
                    </div>
                    <ArrowUpRight size={18} />
                  </a>
                )}

                {safeUrl(p.links.linkedin) && (
                  <a
                    href={safeUrl(p.links.linkedin)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="connect-link-card"
                  >
                    <div className="connect-card-icon">
                      <LinkedinLogo size={24} weight="fill" />
                    </div>
                    <div className="connect-card-text">
                      <span className="connect-card-label">LinkedIn</span>
                      <span className="connect-card-val">Connect on LinkedIn</span>
                    </div>
                    <ArrowUpRight size={18} />
                  </a>
                )}

                {p.links.email && (
                  <a
                    href={`mailto:${p.links.email}`}
                    className="connect-link-card"
                  >
                    <div className="connect-card-icon">
                      <Envelope size={24} weight="duotone" />
                    </div>
                    <div className="connect-card-text">
                      <span className="connect-card-label">Email</span>
                      <span className="connect-card-val">{p.links.email}</span>
                    </div>
                    <ArrowUpRight size={18} />
                  </a>
                )}

                {safeUrl(p.links.website) && (
                  <a
                    href={safeUrl(p.links.website)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="connect-link-card"
                  >
                    <div className="connect-card-icon">
                      <Globe size={24} />
                    </div>
                    <div className="connect-card-text">
                      <span className="connect-card-label">Website</span>
                      <span className="connect-card-val">{p.links.website}</span>
                    </div>
                    <ArrowUpRight size={18} />
                  </a>
                )}

                {p.profiles.map((prof, idx) =>
                  safeUrl(prof.url) ? (
                    <a
                      key={idx}
                      href={safeUrl(prof.url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="connect-link-card"
                    >
                      <div className="connect-card-icon">
                        <Globe size={24} />
                      </div>
                      <div className="connect-card-text">
                        <span className="connect-card-label">{prof.label}</span>
                        <span className="connect-card-val">{prof.url}</span>
                      </div>
                      <ArrowUpRight size={18} />
                    </a>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
