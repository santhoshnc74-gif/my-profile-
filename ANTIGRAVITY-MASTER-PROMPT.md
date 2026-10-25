# Master prompt: Santhosh's interactive 3D portfolio

Act as a senior creative developer, 3D technical artist, product designer and security engineer. Build a complete, runnable personal portfolio inspired by the attached SECOND concept image: the warm, ivory-and-teal miniature interactive workshop. Use Bruno Simon's portfolio as inspiration for playable exploration and Awwwards for typography and presentation. Create an original world and vehicle; do not copy their branding, assets or source code without checking the licence.

I want a real car that visitors can drive around my portfolio. Project stations must show my selected GitHub projects and update automatically. I must be able to change content and presentation through a secure owner dashboard.

## Reference and existing project

Treat the attached second image as the visual reference: ivory architectural platforms, soft daylight, muted teal, natural wood, plants, a learning desk, project displays, a planning wall and a Connect lounge. Preserve its polished, professional atmosphere. Replace the small robot/rover with a properly modelled drivable car.

If my existing workspace is available at C:\santhosh portfolio, inspect it and read AGENTS.md first. Extend the existing React/TypeScript frontend and secure backend instead of discarding working authentication, persistence, GitHub sync, résumé or editor features. This request supersedes the earlier fixed-sidebar design preference. Keep the required hosting adapter files intact. Do not rewrite the project merely to change frameworks.

If starting from scratch, use React, TypeScript and Vite; Three.js with React Three Fiber/Drei and Rapier for 3D/physics; and a secure Node server with a persistent database. Choose maintained compatible versions, lock dependencies and explain any necessary stack changes. Use ordinary semantic HTML for navigation and readable content.

## My verified content

- Name: SANTHOSH N C
- Role: third-year B.Tech student in Artificial Intelligence & Data Science
- College: Excel Engineering College
- Expected graduation: 2028
- GitHub: https://github.com/santhoshnc74-gif
- Current project display name: TEXFLOW
- Repository: https://github.com/santhoshnc74-gif/TEXAFLOW
- TEXFLOW description: a garment and textile factory management project for workforce attendance, orders and production tracking.
- Technologies: React, TypeScript, FastAPI, Python and PostgreSQL
- Other existing projects: aids-study-assistant and scaler-openenv-sql-tuner
- Goals: keep learning through practical projects and become an entrepreneur.
- Do not invent skills, employment, awards, clients, project results or personal contact details. Leave LinkedIn, email and other unprovided profiles empty and hidden until I add them.

## Visual direction

Use the second image's composition: a confident introduction on the left and a beautifully lit miniature workshop occupying most of the right side. Use large readable typography, generous spacing, restrained teal accents and detailed materials. Avoid a generic dashboard appearance, excessive cards, neon effects or distracting overlays.

Introduce me with “A small world. Big ideas.” and a concise, editable student biography. Include “Explore the workshop”, “View résumé” and a visible “Simple view” option. Do not bake editable text into background images. Use actual 3D objects for the interactive world; a screenshot with hotspots is not a substitute for driving.

Provide genuine depth, contact shadows and carefully composed scenery. Optimise licensed GLB/glTF assets and textures. Keep asset origins and licences documented. A high-quality static render may be the loading/fallback image, but the loaded experience must be interactive.

## Driving and exploration

Implement an original small teal car with visible wheels, acceleration, braking, steering, friction and collisions against world boundaries and objects.

- Desktop: WASD or arrow keys to drive, Space to brake, R to reset, Enter or E to open a nearby station.
- Mobile: usable touch steering/joystick and acceleration, brake, interact and reset buttons.
- Smooth follow camera with optional drag-to-orbit, sensible limits and a return-to-default control.
- Do not intercept keyboard shortcuts or driving keys while a form/input is focused. Scope game controls to the active scene.
- Provide a short controls hint, pause control, mute control if audio is included, and a reliable reset if the car flips or becomes stuck.
- Never require driving to access important information. Every destination must also be reachable through keyboard-accessible HTML navigation.
- Use clear proximity cues and an explicit interaction action; avoid opening repeated popups simply because the car passes a station.

Create four recognisable destinations:
1. Projects: a textile/factory display for TEXFLOW and flexible displays for other selected projects.
2. Learning: education and learning interests.
3. Future plans: editable goals on a planning wall.
4. Connect: GitHub, LinkedIn, email, website and additional profiles.

Selecting a station opens a readable, accessible detail panel. Manage keyboard focus, support Escape/close, and return focus appropriately. The scene can pause while a panel is open. Use clear links to repositories and live demos where configured.

## GitHub integration and project control

Use my GitHub account as the data source. Fetch public repository metadata on the SERVER. Never expose a GitHub token to the browser.

- Discover my public repositories with pagination and safe limits.
- Refresh selected repository metadata on startup and approximately every five minutes while the server runs.
- Refresh open portfolio views without a manual reload.
- Show accurate last-successful-sync information and honest stale/unavailable states.
- Honour GitHub rate limits and Retry-After/reset headers, prevent overlapping sync jobs, use caching/conditional requests when appropriate, and back off on failures.
- Keep the last successful snapshot during temporary outages. Handle repository deletion, privacy changes, renames and transfers deliberately.
- Use stable repository IDs for associations. Validate ownership and public visibility.
- Only request fixed GitHub API origins; never fetch arbitrary user-supplied URLs.
- Do not execute repository code or render untrusted README HTML.

The owner dashboard must let me select, pin, hide and reorder repositories; add manual projects; and choose which project appears at each station. Allow display-name, description, cover-image, technology, status and demo-link overrides. GitHub refreshes must preserve my overrides.

Newly discovered repositories should appear in the dashboard for selection. Offer an explicit owner setting to automatically publish newly discovered public repositories; default it off. Do not limit the entire data model permanently to the original three projects. Keep the 3D scene readable with a project carousel/gallery when there are more projects than stations.

Optional signed GitHub webhooks may improve freshness after polling works, but do not make the basic integration depend on them. Verify webhook signatures, reject replays where applicable and rate-limit processing.

## Secure owner dashboard

Provide /admin with real authentication. Public visitors can explore freely; only my authorised owner account can edit. Reuse the existing GitHub OAuth implementation when available, or implement a well-supported provider flow with state and PKCE. Check an immutable owner ID on the server, not merely a username or client-side flag.

Every write endpoint must enforce authentication and authorisation. Never add a production “demo login”, hard-coded password, hidden URL bypass or localStorage-only access check. If credentials are not configured, keep editing locked and show an honest setup state.

The dashboard must support:
- Name, role, biography, headline, introductory labels and résumé.
- Current project details and project display overrides.
- Education title, degree, college, study year, graduation label and year.
- Future-plan heading; add, remove, edit and reorder goals.
- Connect heading/message, GitHub, LinkedIn, email, website and named custom profiles.
- Station titles, descriptions, project assignments, visibility and order.
- Theme colours, typography choices, car colour, sound/motion defaults and safe, bounded scene-layout settings.
- Cover images and permitted scene assets if uploads are implemented, with strict type/size validation and safe storage. Do not accept executable HTML/SVG/scripts as arbitrary assets.
- Preview, validation messages, save/cancel, unsaved-change warnings and confirmation before destructive deletion.

Use a structured schema so future content changes do not require code edits. All displayed text, public profile links, project selections and supported appearance controls must come from persisted configuration. Keep secrets and security policy outside the public content editor. Do not offer arbitrary JavaScript/CSS execution.

GitHub sync and owner-written content must be stored separately. Database changes must be backward compatible and preserve existing edits. Add version history or a practical rollback method for published content.

## Security and data protection

Validate environment variables on startup. Store secrets only in server-side environment settings or the host's secret manager. Commit only a placeholder .env.example, ignore real .env files and never log credentials.

Use secure, HttpOnly, SameSite cookies; session expiry and logout invalidation; CSRF protection for mutations; strict input schemas; parameterised database queries; safe URL protocols; request-size limits; rate limits; and generic public error messages. React text escaping is the default; sanitise explicitly if rich text is truly necessary.

Prefer same-origin requests. If cross-origin access is required, allow only explicit trusted origins. Configure a practical restrictive CSP and other security headers, including production HSTS behind HTTPS. Disable development/debug behaviour in production. Never serve database files, environment files, source secrets or backups from public routes.

Review dependencies and scan the working tree and available Git history for leaked secrets without printing secret values. Document findings and remediation honestly. Do not claim the site is “fully secure” simply because tests pass. Document remaining host-dependent controls, persistent storage, backups and encryption-at-rest requirements.

## Accessibility and performance

Keep a fully usable Simple view with the same projects and content. Support reduced motion, keyboard navigation, visible focus states, adequate contrast and touch-sized controls. Use responsive layouts and readable panels on narrow screens.

Lazy-load the 3D experience, compress textures/models, cap pixel ratio, limit expensive lights/effects, pause rendering in background tabs and provide quality settings when helpful. Show loading progress and a useful fallback if WebGL is unavailable or the context is lost. Do not autoplay sound or require a game/loading animation to view the résumé.

## Validation and delivery

Implement the real experience, not just a plan or static concept. Work in reviewable stages:
1. Inspect existing code, identify reusable parts and establish the reference layout.
2. Build the world, car controls, collisions, camera and accessible navigation.
3. Connect real project displays, persistence, GitHub sync and owner editing.
4. Polish responsive visuals, performance, error states and security.
5. Run the app yourself, open the preview and verify the main journeys.

Test driving/reset, touch controls, station panels, Simple view and reduced motion. Test unauthorised writes, CSRF, invalid input, session expiry, saving/reloading edits, GitHub failures/rate limits and preservation of manual overrides.

Report only checks actually performed. Provide desktop and mobile screenshots, a running local preview, setup documentation, environment-variable names, deployment requirements and an honest security review. Do not ask me to paste secrets into chat.

For 24/7 GitHub monitoring, prepare deployment to a compatible always-running server with persistent storage; a sleeping laptop or static-only deployment is insufficient. Do not publish or purchase hosting without my request. Preserve required Sites adapter files if present, but do not claim a static adapter provides the Node authentication/database backend.

Make reasonable implementation decisions and continue autonomously. Ask only for genuinely missing credentials or a decision that blocks the work. If an advanced effect is infeasible, explain the limitation and deliver the closest functional, accessible result without pretending a static image is real 3D.
