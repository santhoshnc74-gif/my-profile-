// Clean, semantic, fully accessible Simple View for Santhosh's portfolio
import { useState } from 'react';
import {
  ArrowUpRight,
  GithubLogo,
  LinkedinLogo,
  Globe,
  Envelope,
  Star,
  GraduationCap,
  Cube,
  Printer,
  Compass,
} from '@phosphor-icons/react';
import type { Portfolio } from '../types';
import { safeUrl } from '../api';

interface SimpleViewProps {
  portfolio: Portfolio;
  onToggleSimpleView: () => void;
}

export function SimpleView({ portfolio, onToggleSimpleView }: SimpleViewProps) {
  const { profile: p, projects, github } = portfolio;
  const [copyEmailNotice, setCopyEmailNotice] = useState(false);

  const stationsConfig = p.stations || {
    projects: { heading: 'Projects', subtitle: 'Garment & textile factory management system', visible: true },
    learning: { heading: 'Learning', subtitle: 'Education & technical curiosity', visible: true },
    plans: { heading: 'Future plans', subtitle: 'Goals & entrepreneurial roadmap', visible: true },
    connect: { heading: 'Connect', subtitle: 'Let’s start a conversation.', visible: true },
  };

  const copyEmail = () => {
    if (p.links.email) {
      navigator.clipboard.writeText(p.links.email);
      setCopyEmailNotice(true);
      setTimeout(() => setCopyEmailNotice(false), 2500);
    }
  };

  return (
    <div className="simple-view-wrapper">
      {/* Top Navigation */}
      <header className="simple-view-header">
        <div className="header-left">
          <span className="brand-logo">S N C</span>
          <span className="brand-divider">/</span>
          <span className="brand-title">PORTFOLIO</span>
        </div>

        <nav className="header-nav" aria-label="Simple View Navigation">
          <a href="#projects">{stationsConfig.projects.heading}</a>
          <a href="#learning">About & Learning</a>
          <a href="#plans">{stationsConfig.plans.heading}</a>
          <a href="#connect">{stationsConfig.connect.heading}</a>
        </nav>

        <div className="header-actions">
          <button
            className="switch-to-3d-btn"
            onClick={onToggleSimpleView}
            aria-label="Switch to 3D interactive workshop"
            title="Open 3D interactive workshop"
          >
            <Cube size={18} />
            <span>3D Workshop</span>
          </button>
        </div>
      </header>

      <main className="simple-view-main">
        {/* HERO SECTION */}
        <section className="simple-hero-section">
          <div className="hero-tag">
            <span>{p.name}</span>
          </div>
          <h1 className="simple-hero-title">
            A small world.
            <br />
            Big ideas.
          </h1>
          <p className="simple-hero-lead">{p.bio}</p>

          <div className="simple-hero-buttons">
            <button className="primary-button" onClick={onToggleSimpleView}>
              <Cube size={18} />
              <span>Explore the 3D workshop</span>
            </button>
            <a
              href={safeUrl(p.links.resume) || '/resume'}
              className="secondary-button"
              {...(safeUrl(p.links.resume) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              <span>View résumé</span>
              <ArrowUpRight size={16} />
            </a>
          </div>
        </section>

        {/* SECTION 01: PROJECTS */}
        <section id="projects" className="simple-content-section">
          <div className="section-title-row">
            <div>
              <span className="section-number-pill">01</span>
              <h2>{stationsConfig.projects.heading}</h2>
            </div>
            {safeUrl(p.links.github) && (
              <a
                href={safeUrl(p.links.github)!}
                target="_blank"
                rel="noopener noreferrer"
                className="section-external-link"
              >
                <span>All repositories on GitHub</span>
                <ArrowUpRight size={16} />
              </a>
            )}
          </div>
          <p className="section-subtitle-text">{stationsConfig.projects.subtitle}</p>

          <div className="projects-grid">
            {projects.map((project) => (
              <article
                key={project.id}
                className={`simple-project-card ${project.id.toLowerCase() === 'texaflow' ? 'featured' : ''}`}
              >
                <div className="card-top-row">
                  <div>
                    <span className="status-badge">
                      {project.id.toLowerCase() === 'texaflow' ? 'In development' : 'Active'}
                    </span>
                    <h3>{project.name}</h3>
                  </div>
                  {project.stars !== null && (
                    <div className="stars-pill">
                      <Star size={15} weight="fill" />
                      <span>{project.stars}</span>
                    </div>
                  )}
                </div>

                <p className="project-description-text">
                  {project.description ||
                    (project.id.toLowerCase() === 'texaflow'
                      ? p.currentWork.description
                      : 'Repository source code, documentation and commits on GitHub.')}
                </p>

                <div className="tech-tags-list">
                  {(project.id.toLowerCase() === 'texaflow' ? p.currentWork.stack : project.stack).map((tech) => (
                    <span key={tech} className="tech-tag">
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="card-footer-links">
                  {safeUrl(project.githubUrl) && (
                    <a
                      href={safeUrl(project.githubUrl)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="project-link-btn"
                    >
                      <GithubLogo size={18} />
                      <span>Source code</span>
                      <ArrowUpRight size={15} />
                    </a>
                  )}
                  {safeUrl(project.liveUrl) && (
                    <a
                      href={safeUrl(project.liveUrl)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="project-link-btn"
                    >
                      <Globe size={18} />
                      <span>Live preview</span>
                      <ArrowUpRight size={15} />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="simple-sync-note">
            <p>
              {github.status === 'synced'
                ? 'GitHub project metadata updates automatically every 5 minutes while the server runs.'
                : 'Showing saved project snapshot.'}
              {github.syncedAt && (
                <>
                  {' '}
                  Last synced: <time dateTime={github.syncedAt}>{new Date(github.syncedAt).toLocaleString()}</time>.
                </>
              )}
            </p>
          </div>
        </section>

        {/* SECTION 02: LEARNING & EDUCATION */}
        <section id="learning" className="simple-content-section">
          <div className="section-title-row">
            <div>
              <span className="section-number-pill">02</span>
              <h2>{stationsConfig.learning.heading}</h2>
            </div>
          </div>
          <p className="section-subtitle-text">{stationsConfig.learning.subtitle}</p>

          <div className="simple-education-card">
            <div className="education-icon-container">
              <GraduationCap size={36} weight="duotone" />
            </div>
            <div className="education-details">
              <h3>{p.education.degree}</h3>
              <p className="college-name">{p.education.institution}</p>
              <p className="timeline-text">
                {p.education.yearOfStudy} · {p.education.graduationLabel} {p.education.graduationYear}
              </p>
            </div>
          </div>

          <div className="learning-narrative-box">
            <h3>Philosophy & Hands-on Exploration</h3>
            <p>{p.bio}</p>
          </div>
        </section>

        {/* SECTION 03: FUTURE PLANS */}
        {p.goals.length > 0 && (
          <section id="plans" className="simple-content-section">
            <div className="section-title-row">
              <div>
                <span className="section-number-pill">03</span>
                <h2>{stationsConfig.plans.heading}</h2>
              </div>
            </div>
            <p className="section-subtitle-text">{stationsConfig.plans.subtitle}</p>

            <div className="simple-goals-grid">
              {p.goals.map((goal, idx) => (
                <div key={idx} className="simple-goal-item">
                  <div className="goal-index-bubble">{idx + 1}</div>
                  <div>
                    <h3>{goal.title}</h3>
                    <p>{goal.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION 04: CONNECT */}
        <section id="connect" className="simple-content-section">
          <div className="section-title-row">
            <div>
              <span className="section-number-pill">04</span>
              <h2>{stationsConfig.connect.heading}</h2>
            </div>
          </div>
          <p className="section-subtitle-text">{p.contact?.description || stationsConfig.connect.subtitle}</p>

          <div className="simple-connect-grid">
            {safeUrl(p.links.github) && (
              <a
                href={safeUrl(p.links.github)!}
                target="_blank"
                rel="noopener noreferrer"
                className="connect-action-card"
              >
                <div className="connect-card-left">
                  <GithubLogo size={24} weight="fill" />
                  <div>
                    <span className="connect-title">GitHub</span>
                    <span className="connect-subtitle">santhoshnc74-gif</span>
                  </div>
                </div>
                <ArrowUpRight size={18} />
              </a>
            )}

            {safeUrl(p.links.linkedin) && (
              <a
                href={safeUrl(p.links.linkedin)!}
                target="_blank"
                rel="noopener noreferrer"
                className="connect-action-card"
              >
                <div className="connect-card-left">
                  <LinkedinLogo size={24} weight="fill" />
                  <div>
                    <span className="connect-title">LinkedIn</span>
                    <span className="connect-subtitle">Professional Profile</span>
                  </div>
                </div>
                <ArrowUpRight size={18} />
              </a>
            )}

            {p.links.email && (
              <div className="connect-action-card email-card">
                <div className="connect-card-left">
                  <Envelope size={24} weight="duotone" />
                  <div>
                    <span className="connect-title">Email</span>
                    <span className="connect-subtitle">{p.links.email}</span>
                  </div>
                </div>
                <div className="email-actions">
                  <a href={`mailto:${p.links.email}`} className="action-link">
                    Write email
                  </a>
                  <button onClick={copyEmail} className="copy-btn">
                    {copyEmailNotice ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {safeUrl(p.links.website) && (
              <a
                href={safeUrl(p.links.website)!}
                target="_blank"
                rel="noopener noreferrer"
                className="connect-action-card"
              >
                <div className="connect-card-left">
                  <Globe size={24} />
                  <div>
                    <span className="connect-title">Website</span>
                    <span className="connect-subtitle">{p.links.website}</span>
                  </div>
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
                  className="connect-action-card"
                >
                  <div className="connect-card-left">
                    <Compass size={24} />
                    <div>
                      <span className="connect-title">{prof.label}</span>
                      <span className="connect-subtitle">{prof.url}</span>
                    </div>
                  </div>
                  <ArrowUpRight size={18} />
                </a>
              ) : null
            )}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="simple-view-footer">
        <div className="footer-left">
          <span>{p.name} · Portfolio</span>
        </div>
        <div className="footer-right">
          <a href="/resume" className="footer-link">
            <Printer size={15} />
            <span>Print résumé</span>
          </a>
          <a href="/admin" className="footer-link owner-link">
            <span>Owner Dashboard</span>
            <ArrowUpRight size={14} />
          </a>
        </div>
      </footer>
    </div>
  );
}
