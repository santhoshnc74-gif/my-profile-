# Prototype Instructions

## Confirmed design and editing preferences
- Latest selected direction (2026-10-17): the second interactive-workshop concept, with ivory/teal miniature architecture and a drivable car. This supersedes the former fixed-sidebar layout. Preserve professional readability, editable content and secure owner access. Current request is a master prompt for implementation in Antigravity, not permission to deploy.
- Connect must support owner-editable LinkedIn, GitHub, email, website, custom profiles, heading and invitation text. Hide empty optional links; never invent personal URLs.
- Keep editing behind owner authentication and persist changes on the server.
- Education and Future plans must be fully owner-editable: section headings, degree, college, study year, graduation wording/year, goal titles and descriptions. Support adding, removing and reordering goals while preserving the approved visual style.
- GitHub project metadata should update automatically while the site is running, and open browser tabs should reflect changes without a manual reload.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
