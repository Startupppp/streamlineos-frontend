# StreamlineOS

![StreamlineOS](public/logo.svg)

> The operating system for modern teams — HR, Projects, CRM, Chat, and Analytics in a single platform built on one Postgres data model. Open alternative to Odoo.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Postgres](https://img.shields.io/badge/Postgres-15%2B-336791?logo=postgresql)](https://www.postgresql.org)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-c5f74f)](https://orm.drizzle.team)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)

---

## What's inside

| Module | Highlights |
|---|---|
| **HR** | Employees, attendance, leaves, payroll, expenses, assets, documents, performance reviews, goals, recruitment pipeline, onboarding, exit & termination, compliance. |
| **CRM** | Leads, deals, clients, organizations, targets, quotes, assignment & scoring rules, SLA tracking, territories, win/loss analysis. |
| **Projects** | Projects, sprints, cycles, modules, tickets (with epics/sub-issues), timesheets, resource allocation, project templates. |
| **Chat & Comms** | Realtime DMs and channels (Ably), notifications, command palette (⌘K), helpdesk inbox. |
| **Marketing** | Campaigns, landing pages, content + email calendars, social analytics, A/B testing. |
| **Finance** | Billing, invoices, sales commissions, customer success, renewal pipeline. |
| **Admin** | Permission-matrix RBAC, audit log, branches, webhooks, custom fields, MFA, IP allowlists, branded blog. |

---

## Architecture

- **Next.js 16 (App Router)** — server components, edge middleware, server actions.
- **Postgres + Drizzle ORM** — one schema for the full product surface; type-safe queries throughout.
- **NextAuth v5** — credentials + Google OAuth; JWT sessions cached in Redis (5-min TTL).
- **Redis (Upstash)** — session cache, rate limits.
- **Cloudflare R2** — file uploads (avatars, docs, attachments).
- **Ably** — realtime chat / presence.
- **Tailwind CSS v4 + Radix UI** — `shadcn`-style primitives.
- **TanStack Query** — client-side data layer over the REST API in `app/api/**`.
- **Resend / SendGrid** — transactional email.
- **Inngest** — background jobs (scheduled reports, payroll generation).
- **AI (optional)** — Vercel AI SDK with Google Generative AI + OpenAI.

```
app/                       Next.js routes
  (auth)/                  signin, signup, reset-password
  (public)/                landing, blog, pricing, about, contact, legal
  (dashboard)/             authenticated product surface
  api/                     REST endpoints (auth, roles, hr, crm, projects, ...)
  layout.tsx               Root metadata + providers
  middleware.ts            Edge gate — permission-driven route blocks
components/                Shared UI primitives
features/                  Domain-grouped views & components
lib/
  auth.ts                  NextAuth config + JWT/session callbacks
  db/schema/               Drizzle schema, per domain
  rbac/                    Role/permission model, gates, default org roles
  branding.ts              Single source of truth for brand strings
scripts/                   Seeders and ops scripts
types/                     Global types (next-auth augmentation, etc.)
```

---

## Role-based access control

StreamlineOS uses **permission-matrix RBAC** modeled after Odoo's access groups. Role *names* are not hardcoded — admins define them in the UI.

- **`OWNER`** is the only structurally privileged role. Assigned automatically at signup; cannot be locked out. Super-admin bypass on every check.
- Every other role is a per-org row in the `roles` table — name, slug, and permission list are fully editable in `/settings/roles`.
- The route gate (`middleware.ts`) checks the user's effective permissions against a `ROUTE_PERMISSION_MAP`, not against role names. Toggle a permission off in the matrix and the page stops opening for that user.
- The sidebar is permission-filtered: each nav item declares `requiredPermission`, and only visible items render.
- Effective permissions are computed once per JWT refresh (`getUserPermissions`) and cached in Redis with the session.

**Default roles seeded on signup** (all editable / deletable):

`Administrator` · `HR Manager` · `Project Manager` · `Sales` · `Team Member`

---

## Getting started

### Prerequisites

- **Node.js** 20+
- **pnpm** 10+ (repo pins `packageManager: pnpm@10.18.0`)
- **Postgres** 15+ (local, Neon, Supabase, RDS, etc.)
- **Redis** (optional in dev; required in prod — Upstash recommended)

### 1. Install

```bash
git clone <repo-url> streamlineos
cd streamlineos
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Minimum required:

| Variable | What |
|---|---|
| `NEXTAUTH_SECRET` | `openssl rand -base64 48` |
| `NEXTAUTH_URL` | e.g. `http://localhost:1000` |
| `NEXT_PUBLIC_APP_URL` | Same as above |
| `NEXT_PUBLIC_API_URL` | NestJS backend URL, e.g. `http://localhost:1500` |
| `BACKEND_JWT_SECRET` | Must match the backend `.env` |
| `INTERNAL_API_SECRET` | Must match the backend `.env` |

Optional: Google OAuth (sign-in), Resend or SendGrid (owner-console email status), Turnstile site key (landing captcha), analytics IDs. All business-side secrets (database, Redis, R2, Ably, Razorpay, VAPID) live in the backend `.env` — see `.env.example` for the complete frontend list.

### 3. Provision the database

```bash
pnpm db:push       # apply the Drizzle schema
```

### 4. Run

```bash
pnpm dev           # starts Next on http://localhost:1000
```

Sign up at `/signup` — the first user of an org becomes its `OWNER` and the default roles get seeded automatically.

---

## Demo workspace

For customer walkthroughs, spin up a fully-populated demo workspace in one command:

```bash
pnpm seed:demo
```

This creates (or refreshes) **Demo · StreamlineOS** with:

- 1 OWNER + 5 team users (HR Manager, PM, Sales, Engineer, Designer)
- 5 default org roles ready for the `/settings/roles` matrix demo
- 5 CRM leads + 2 deals
- 1 project + 5 tickets
- 3 recruitment candidates
- 7 days of attendance + 2 leave requests across the team

**Default credentials** (override via `DEMO_OWNER_EMAIL` / `DEMO_OWNER_PASSWORD`):

| Role | Email | Password |
|---|---|---|
| Owner | `demo@streamlineos.in` | `Demo@2026!` |
| HR Manager | `priya.hr@demo.streamlineos.in` | `DemoTeam@2026!` |
| Project Manager | `arjun.pm@demo.streamlineos.in` | `DemoTeam@2026!` |
| Sales | `neha.sales@demo.streamlineos.in` | `DemoTeam@2026!` |
| Engineer | `rahul.eng@demo.streamlineos.in` | `DemoTeam@2026!` |
| Designer | `sara.design@demo.streamlineos.in` | `DemoTeam@2026!` |

The seeder is idempotent — re-running it refreshes the OWNER password and tops up missing rows without creating duplicates.

**Suggested demo flow**
1. Log in as OWNER → populated dashboard.
2. Walk through `/settings/roles` → toggle a permission off, show the page stop opening for that role.
3. Switch to HR Manager → HR-only sidebar (CRM and Finance hidden).
4. Switch to Sales → CRM pipeline with leads + deals.
5. Switch to PM → project board with tickets.

---

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Start Next.js dev server (port **1000**) |
| `pnpm build` | Production build |
| `pnpm start` | Serve production build |
| `pnpm lint` | Run ESLint |
| `pnpm db:push` | Apply Drizzle schema to the database |
| `pnpm db:generate` | Generate a migration from schema diff |
| `pnpm db:migrate` | Run generated migrations |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm setup:r2` | Create configured Cloudflare R2 buckets |
| `pnpm seed:owner` | Create / refresh the platform-owner user |
| `pnpm seed:demo` | Seed the demo workspace (HR, CRM, Projects sample data) |
| `pnpm seed:blog` | Seed sample blog posts (uses `BLOGS_DB` if set) |

---

## Public site & SEO

- Public routes live under `app/(public)` — landing, pricing, about, contact, blog, legal.
- Per-page canonicals declared via `metadata.alternates.canonical`. The root layout deliberately **does not** set a default canonical so child pages canonicalize to themselves.
- `app/sitemap.ts` lists indexable marketing routes; `app/robots.ts` allows the marketing surface and disallows authenticated areas.
- Structured data (`Organization`, `WebSite`, `SoftwareApplication`, `FAQPage`) emitted from `features/seo/structured-data`.
- Google Tag Manager + Microsoft Clarity hooks render only when their IDs are configured.

---

## Production deployment

- Runs on any Next-compatible host (Vercel, Fly.io, Railway, self-hosted Node).
- Required for prod: the NestJS backend (`streamlineos-api`) reachable at `NEXT_PUBLIC_API_URL`, matching `BACKEND_JWT_SECRET`/`INTERNAL_API_SECRET`, and HTTPS termination. Database, Redis, storage, email delivery, and payments are provisioned in the backend.
- Middleware enforces HTTPS redirects (`x-forwarded-proto`), MFA gates, and coarse routing; authorization is re-asserted in the backend on every request.

---

## Customising

- **Branding** — every brand string is centralised in `lib/branding.ts`. Change once, propagates to metadata, emails, and JSON-LD.
- **Permissions** — add new permissions in `lib/rbac/permissions.ts`; map them to routes in `middleware.ts` (`ROUTE_PERMISSION_MAP`) and to nav items in `components/layout/sidebar/sidebar-nav-items.ts` (`requiredPermission`).
- **Schema** — extend a domain file under `lib/db/schema/`, run `pnpm db:generate` to produce a migration, then `pnpm db:migrate`.
- **Default org roles** — edit `lib/rbac/default-org-roles.ts`. Used by both signup and the demo seeder.
- **Email provider** — switch via `EMAIL_PROVIDER` (`resend` / `sendgrid`) in `.env`.
- **Storage provider** — R2 is the default but any S3-compatible bucket works through the same client.

---

## License

Proprietary — © StreamlineOS. All rights reserved.

For commercial licensing, contact [support@streamlineos.in](mailto:support@streamlineos.in).


