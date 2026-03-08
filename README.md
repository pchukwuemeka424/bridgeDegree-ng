# BridgeDegree

Nigeria's Career Infrastructure Platform — Node.js (Express + EJS) website with reusable components, student onboarding, partner onboarding, How It Works, FAQ, and Blog.

## Project structure

- **`server.js`** — Express app, routes, and shared data for views
- **`views/`** — EJS templates
  - **`layout.ejs`** — Main layout (head, header, footer, scripts)
  - **`partials/`** — Reusable layout pieces: `header.ejs`, `footer.ejs`, `legal-footer.ejs`, `breadcrumb.ejs`
  - **`components/`** — Reusable UI: `logo.ejs`, `contact-info.ejs`, `social-icons.ejs`
  - Page views: `index.ejs`, `about.ejs`, `contact.ejs`, `faq.ejs`, `blog.ejs`, `how-it-works.ejs`, `onboarding-students.ejs`, `onboarding-partners.ejs`, `students-apply.ejs`, `policy.ejs`
- **`public/`** — Static assets
  - **`css/site.css`** — Global styles (variables, header, footer, forms, breadcrumb)
  - **`css/home.css`** — Home page sections (hero, problem, solution, partners, testimonials)
- **`static/images/`** — Images (served at `/images/` by Express)

## Setup

```bash
npm install
npm start
```

Open **http://localhost:5000**

(Port is configurable via `PORT` env var, e.g. `PORT=3000 npm start`.)

## Reusable components

- **Header** — Top bar (contact, links) + main nav with active state; uses `routes` and `currentRoute` from `res.locals`.
- **Footer** — Three columns: brand + tagline, quick links, contact + social icons. Uses `quickLinks` and shared components.
- **Logo** — `views/components/logo.ejs`: accepts `size`, `id` (for SVG gradient).
- **Breadcrumb** — `views/partials/breadcrumb.ejs`: pass `breadcrumb` array of `{ path?, label }`.
- **Contact info** — Address, email, phone with Lucide icons.
- **Social icons** — Used in footer and CTA band.

Routes and quick links are defined once in `server.js` and passed to all views via `res.locals`, so changing a path or label only requires editing `server.js`.

## Share with others (Cloudflare Tunnel)

To let others view your site without deploying it, use a Cloudflare Tunnel. Your app stays on your machine; Cloudflare gives you a public URL.

### 1. Install cloudflared

- **macOS (Homebrew):** `brew install cloudflared`
- **Other:** [Install cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)

### 2. Start the app

In one terminal:

```bash
npm start
```

### 3. Start the tunnel

In another terminal:

```bash
chmod +x run_tunnel.sh
./run_tunnel.sh
```

Or run cloudflared directly:

```bash
cloudflared tunnel --url http://127.0.0.1:5000
```

### 4. Share the URL

The tunnel will print a URL like `https://something-random.trycloudflare.com`. Share that link; anyone can open it to view your site.

**Note:** While the tunnel is running, your Node app must stay running. Closing either process will stop the shared link from working.
