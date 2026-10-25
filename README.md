# Santhosh portfolio

Responsive React portfolio with a Node 24+ server and persistent SQLite profile storage.

## Editing Connect

Use the **Edit portfolio** link in the footer to open the owner workspace. Education includes editable section title, degree, college, study year, graduation wording and year. Future plans includes an editable section title and up to six goals that you can add, remove and reorder. Removing every goal hides that section. Saved changes also appear in the printable résumé and navigation. Existing profiles receive defaults for newly added heading fields automatically.

Open `/admin` and sign in with the configured owner's GitHub account. The Connect section edits the heading, message, LinkedIn, GitHub, website, email and résumé URL. More profiles supports up to eight named links. Save changes publishes them to the portfolio; blank optional links stay hidden.

Owner authentication is not configured in the delivered local preview. To enable it, copy `.env.example` to `.env` and register a GitHub OAuth application with callback `<PUBLIC_ORIGIN>/auth/github/callback`. Set its client ID, client secret and your immutable numeric GitHub user ID together. Keep the secret in the server environment, never in frontend code or chat. The public portfolio remains available while editing is locked.

## Development and hosting

`npm install`, then `npm run dev` runs the API and Vite. `npm test` checks authentication and profile APIs. `npm run build` builds the frontend; `npm start` serves it with the backend. Use Node 24 or newer.

For production set `NODE_ENV=production`, an HTTPS `PUBLIC_ORIGIN`, and a persistent `DATA_DIR`. Run a single instance with a TLS reverse proxy and restricted disk access; back up the database. Configure `TRUST_PROXY=loopback` only when the proxy runs on loopback. Never expose development servers publicly.

GitHub metadata for the three selected repositories refreshes on startup and every five minutes while the Node server runs. Open portfolio tabs refresh from the server every minute and when returning to the tab or reconnecting. Languages, descriptions, stars, URLs and update timestamps refresh; personal profile and Connect text change only when the owner saves. The selected-project list is curated in `server/profile.mjs`; newly created repositories are not automatically published. Private/deleted repositories are removed on a successful check. Network failures retain the last successful snapshot, with exponential retry delays and GitHub rate-limit backoff. A continuously running deployed Node server is required for 24/7 monitoring; a stopped or sleeping local computer cannot monitor.

The preserved Sites build is a static frontend adapter. Its static worker does not supply the Node authentication/database backend; full editing requires the Node deployment described above.
