# Team Genesis Website

Official website for **Team Genesis**, the humanoid robotics team of **VIT Chennai**.

This repository contains the production-ready frontend codebase for the Genesis website, designed to represent the team’s engineering philosophy, structure, and identity in a clear, modern, and maintainable way.

---

## Overview

The Genesis website is a **React-based frontend application** built with an emphasis on:

- system-driven UI architecture (not template-based layouts)
- clarity over visual noise
- scalability across departments and future iterations
- consistency in design language and interaction patterns

The website serves as the public-facing representation of Team Genesis and is intended to evolve alongside the team.

---

## Design & Engineering Principles

This project intentionally avoids generic UI patterns and focuses on:

- **Structure-first design**  
  Interfaces are built to communicate hierarchy, intent, and system relationships clearly.

- **Restraint over decoration**  
  Visual effects are used sparingly and only when they reinforce meaning.

- **Maintainability**  
  Components, styles, and assets are organized to support long-term iteration by multiple contributors.

- **Responsiveness by default**  
  All layouts are designed to work cleanly across desktop and mobile devices.

---

## Tech Stack

- **React 18** single-page app with **React Router 6**
- **Vite 8** for development and builds
- **Cloudflare Workers** (static assets + a small Worker for `/api/*`)
- **JavaScript (ES6+)**
- **CSS (custom styles, design tokens via variables)**
- **Git & GitHub** for version control and collaboration

No external UI frameworks are used to preserve design flexibility and control.

---

## Development

Requirements: Node.js 22.13 or newer (the version in `.nvmrc` is what CI uses) and npm.

```bash
npm ci            # install exact dependency versions from package-lock.json
npm run dev       # dev server on http://localhost:5173 with hot reload
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server. The Worker in `worker/index.js` runs in the local Cloudflare runtime (workerd), so `/api/health` works too. |
| `npm run build` | Production build into `dist/` (see below). |
| `npm run preview` | Serves the production build on http://localhost:4173 in the local Cloudflare runtime, with the same routing, 404 handling and `_headers` as production. Run `npm run build` first. |
| `npm run lint` | ESLint (`eslint.config.mjs`). |
| `npm run build:atlases` | Regenerates the scroll-sequence atlases in `public/frame-atlases/` from `public/frames/`. |
| `npm run cf-typegen` | Generates `worker-configuration.d.ts` (types for the Worker's bindings). |
| `npm run deploy` | Builds and deploys to Cloudflare with your local Wrangler login. Normally use the GitHub Action instead. |

### Project layout

- `index.html`: the page template (fonts, SEO tags, JSON-LD). Vite injects the bundles.
- `src/main.jsx`: entry point. `src/App.jsx`: routes.
- `src/routes/meta.js`: title, description and canonical URL for every route. This is the
  single source of truth: it is used at runtime (`src/utils/pageMeta.js`) and at build time.
- `public/`: copied as-is to the site root (`robots.txt`, `sitemap.xml`, images, `_headers`).
- `worker/index.js`: Cloudflare Worker, only runs for `/api/*`.
- `wrangler.jsonc`: Cloudflare configuration. `vite.config.mjs`: Vite configuration.

### Adding a page

1. Add the `<Route>` in `src/App.jsx`.
2. Add its title and description to `ROUTE_META` in `src/routes/meta.js` (path without a
   trailing slash, e.g. `/team/design`).
3. Add the URL to `public/sitemap.xml`. The build fails if the sitemap lists a path that has no
   entry in `src/routes/meta.js`.

### What the build produces

`npm run build` writes:

- `dist/client/`: everything that is served as static assets. Besides the JS/CSS in
  `dist/client/assets/` (file names contain a content hash), it contains one HTML file per
  route (`index.html`, `robo-hi.html`, `team/leads.html`, ...) with that route's title,
  description, canonical URL and Open Graph / Twitter tags already in the HTML, plus
  `404.html`. This is done by `scripts/prerender-routes.mjs` so that link previews on
  WhatsApp, LinkedIn, X and Slack (which don't run JavaScript) show the right page. The page
  content itself is still rendered by React in the browser.
- `dist/genesis_website/`: the bundled Worker and the generated `wrangler.json` that
  `wrangler deploy` uses.

Cloudflare limits each static file to 25 MiB; `npm run preview` and `wrangler deploy` fail
with "Asset too large" if a file in `public/` is bigger.

### How URLs are served

Configured in `wrangler.jsonc` (`html_handling: "auto-trailing-slash"`,
`not_found_handling: "404-page"`):

| Request | Response |
| --- | --- |
| `/team/leads` | 200, `team/leads.html` (canonical URL, as in the sitemap) |
| `/team/leads/`, `/team/leads.html` | 307 redirect to `/team/leads` |
| `/some/unknown/path` | 404, `404.html` (noindex); React renders the Not Found page |
| missing file, e.g. `/assets/old.js` | 404 |
| `/api/health` | 200 JSON from the Worker |

In `npm run dev` there are no per-route HTML files yet, so every page path is answered with
`index.html` (status 200).

---

## Deploying to Cloudflare

The site is a Cloudflare Worker named `genesis-website` with static assets, served at
`https://www.teamgenesisvitc.in` and `https://teamgenesisvitc.in`.

### Workers Builds (how it deploys)

The repository is connected to the Worker (**Workers & Pages > genesis-website > Settings >
Build**). Every push runs `npm run build`, then:

- on `main`: `npx wrangler deploy`, i.e. production;
- on any other branch: `npx wrangler preview`, which creates a
  [Preview](https://developers.cloudflare.com/workers/previews/) with its own URL and reports it
  on the pull request as the **Workers Builds: genesis-website** check. This command needs the
  `previews` block in `wrangler.jsonc` (it may stay empty).

### GitHub Actions (manual fallback)

`.github/workflows/deploy-cloudflare.yml` builds the site and runs `wrangler deploy`. It only
runs when started by hand: **Actions > Deploy to Cloudflare Workers > Run workflow**.

It needs two repository secrets (**Settings > Secrets and variables > Actions**):

- `CLOUDFLARE_ACCOUNT_ID`: shown on the Cloudflare dashboard (Workers & Pages overview, or the
  account home page).
- `CLOUDFLARE_API_TOKEN`: create one under **My Profile > API Tokens > Create Token** with the
  **Edit Cloudflare Workers** template, limited to this account (and, after the domain move,
  to the `teamgenesisvitc.in` zone).

The first deploy publishes the site at `https://genesis-website.<your-subdomain>.workers.dev`.

### From your machine

```bash
npx wrangler login     # once
npm run deploy         # = npm run build && wrangler deploy
```

To check the production build locally in the Cloudflare runtime first: `npm run build` then
`npm run preview` (or `npx wrangler dev`, which serves the same build on port 8787).

### Moving teamgenesisvitc.in to Cloudflare

Done on 2026-10-12 (steps 1 to 4): the zone is active in Cloudflare and both hostnames are
custom domains of the Worker. Steps 5 to 7 are still open. The steps, for reference:

1. **Add the zone.** In the Cloudflare dashboard, **Add a domain** > `teamgenesisvitc.in`
   (Free plan is fine). Cloudflare scans the existing DNS records.
2. **Check the imported DNS records before switching anything.** Compare them with the
   records at Hostinger and add whatever is missing, in particular: the Google Search Console
   verification `TXT` record, any `MX` / `TXT` (SPF, DKIM, DMARC) records for email, and any
   other subdomains. Records for the website itself (the Vercel `A` / `CNAME` for the apex and
   `www`) will be replaced in step 4.
3. **Switch nameservers.** At Hostinger (**Domains > teamgenesisvitc.in > DNS / Nameservers**),
   replace Hostinger's nameservers with the two Cloudflare nameservers shown for the zone. Wait
   until Cloudflare shows the zone as **Active** (minutes to a few hours). The site keeps
   working on Vercel in the meantime because the copied DNS records still point there.
4. **Attach the domains to the Worker.** Either in the dashboard (**Workers & Pages >
   genesis-website > Settings > Domains & Routes > Add > Custom domain**) for both
   `teamgenesisvitc.in` and `www.teamgenesisvitc.in`, or by uncommenting the `routes` block in
   `wrangler.jsonc` and deploying. Cloudflare creates the DNS records and certificates. If it
   reports that a DNS record already exists for the hostname, delete the old Vercel `A` /
   `CNAME` record for it and add the custom domain again.
5. **Verify** `https://www.teamgenesisvitc.in/`, a team page such as `/team/leads`, an unknown
   URL (should be 404) and `/api/health`. The canonical URLs use `https://www.teamgenesisvitc.in`,
   so also make the apex redirect to `www` instead of serving a duplicate copy, e.g. a
   **Rules > Redirect Rule** with wildcard pattern `https://teamgenesisvitc.in/*` and target
   `https://www.teamgenesisvitc.in/${1}` (301, preserve query string).
6. **Retire the old hosting.** Each of these still builds or serves the site and posts its own
   check on every pull request:
   - the Vercel project `team-genesis/genesis-website`: remove the domain, then disconnect the
     Git repository or delete the project;
   - the Worker `teamgenesis` in a second Cloudflare account, also connected to this
     repository (its production builds fail): disconnect it under **Settings > Build**, or
     delete it;
   - GitHub Pages: `.github/workflows/deploy.yml` is manual-only now; turn Pages off under
     **Settings > Pages**. The committed `build/` directory is no longer used.
7. Optionally enable HSTS (**SSL/TLS > Edge Certificates**) once everything works over HTTPS,
   and resubmit `https://www.teamgenesisvitc.in/sitemap.xml` in Search Console.

---

## License

© 2026 Team Genesis, VIT Chennai. All rights reserved.


