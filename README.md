# BridgeDegree

**Nigeria's Career Infrastructure Platform** — the official website for BridgeDegree.

## What BridgeDegree is

BridgeDegree is career infrastructure for Nigerian university students. It does not replace a degree; it runs alongside it so that by graduation, students have **verified work experience**, **published research**, and a **Career Passport** that any employer, anywhere, can trust in seconds.

### The problem

Over 600,000 graduates enter the job market each year. Most are qualified. Nearly all are invisible — not because they lack ability, but because the system produces academic records and little else: no verifiable work history, no published research, no globally legible career profile.

### The solution

Three integrated engines, embedded into the academic timeline from 100 Level:

- **Work Experience Engine** — Structured internships from 200 Level with vetted corporate partners. Performance-tracked, mentor-validated, blockchain-credentialed. Students graduate with 2+ years of documented experience.
- **Publication Pipeline** — Final-year research aligned to real industry problems, co-authored and prepared for submission to indexed journals. Research that gets published and cited.
- **Global Mobility Framework** — A structured path to international placements and globally recognised credentials.

Every output is authenticated and added to the student’s **Career Passport** — a single, verifiable record of capability.

### Who it’s for

- **Students** — Nigerian undergraduates who want to build proof while they study.
- **Corporate partners** — Employers who get first access to pre-vetted, performance-tracked graduates (tiered: Platinum, Gold, Standard).
- **Universities & advocates** — Institutions and individuals who want to connect students to the programme.

This repository is the **BridgeDegree marketing and information website**: home page, student and partner information, How it works, FAQ, blog, contact, policy, and application entry points.

---

## Tech stack

- **Node.js** + **Express**
- **EJS** templates with **express-ejs-layouts**
- Shared layout, partials, and components (header, footer, breadcrumb, contact info, social icons)
- Static assets and images under `public/` and `static/images/`
- Lucide icons

## Project structure

- **`server.js`** — Express app, routes, and shared data for views (`routes`, `quickLinks`, `currentRoute`).
- **`views/`** — EJS templates
  - **`layout.ejs`** — Main layout (head, header, footer, scripts).
  - **`partials/`** — `header.ejs`, `footer.ejs`, `legal-footer.ejs`, `breadcrumb.ejs`.
  - **`components/`** — `logo.ejs`, `contact-info.ejs`, `social-icons.ejs`.
  - Page views: `index.ejs`, `about.ejs`, `contact.ejs`, `faq.ejs`, `blog.ejs`, `how-it-works.ejs`, `onboarding-students.ejs`, `onboarding-partners.ejs`, `students-apply.ejs`, `policy.ejs`.
- **`public/`** — Static assets
  - **`css/site.css`** — Global styles (variables, header, footer, forms, breadcrumb).
  - **`css/home.css`** — Home page (hero, problem, solution, partners, testimonials).
- **`static/images/`** — Images served at `/images/`.

## Setup

```bash
npm install
npm start
```

Open **http://localhost:3000** (or the port set by the `PORT` environment variable).

## Reusable pieces

- **Header** — Top bar (email, phone) + main nav with active state; uses `routes` and `currentRoute` from `res.locals`.
- **Footer** — Brand (logo + tagline), quick links, contact + social; uses `quickLinks` and shared components.
- **Breadcrumb** — Pass a `breadcrumb` array of `{ path?, label }`.
- **Contact info** — Address, email, phone (Lucide icons).
- **Social icons** — Used in footer.

Routes and quick links are defined in `server.js` and passed to all views via `res.locals`.

## Deploy on Vercel

The app is set up for [Vercel](https://vercel.com) deployment:

- **`vercel.json`** — Sends all requests to the Express app via the `api/index.js` serverless handler.
- **`api/index.js`** — Exposes the Express app for Vercel’s Node runtime.

To deploy:

1. Push the repo to GitHub (or connect another Git provider in Vercel).
2. In [Vercel](https://vercel.com), **Add New Project** and import this repository.
3. Leave **Build Command** and **Output Directory** as default (no static export).
4. Deploy. The site will run with Node 18+ and use the `PORT` Vercel provides.

Optional: set any env vars (e.g. for future APIs) in the Vercel project **Settings → Environment Variables**.

## Share locally (Cloudflare Tunnel)

To give others a public URL to your local site:

1. **Install cloudflared** — e.g. `brew install cloudflared` on macOS, or see [Cloudflare’s install guide](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/).
2. **Start the app:** `npm start`
3. **In another terminal:** `cloudflared tunnel --url http://127.0.0.1:3000` (or your `PORT`).
4. Share the printed URL (e.g. `https://….trycloudflare.com`).

Your Node app must stay running while the tunnel is in use.

---

**Developed by** Prince Chukwuemeka · **Acehub Technologies Ltd**  
**Website:** [www.bridgdegree.com](https://www.bridgdegree.com)  
No copyright.
