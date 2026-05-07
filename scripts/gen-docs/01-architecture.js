// Doc 1 — System Architecture & Overview
// Generates docs/word-docs/01-system-architecture.docx
const fs = require("fs");
const path = require("path");
const { Document, Packer, TableOfContents } = require("docx");
const S = require("./_styles");

const DOC_NUMBER = "01";
const DOC_TITLE = "System Architecture & Overview";

const cover = S.coverPage({
  docNumber: DOC_NUMBER,
  title: DOC_TITLE,
  subtitle: "The foundational document — read this first.",
  audience: "Engineering team (developers, tech leads, SREs)",
  version: "1.0",
  repoSha: process.env.REPO_SHA || "232c5b59",
  date: process.env.DOC_DATE || "May 2026",
});

const toc = [
  S.h1("Table of Contents"),
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-3" }),
  S.pageBreak(),
];

const intro = [
  S.h1("1. Introduction"),

  S.h2("1.1 Purpose"),
  S.body(
    "This document is the architectural foundation for the Vaivamm Capital CRM codebase. " +
      "Every other document in this set (HR & Payroll, CRM, Auth, API Reference, etc.) assumes " +
      "the reader has already absorbed the layering, naming conventions, and request lifecycle " +
      "described here. New engineers should read this end-to-end before diving into a specific module."
  ),
  S.body(
    "The codebase is a Next.js 16 App Router application with a Postgres (NeonDB) backend " +
      "accessed through Drizzle ORM. It serves an internal CRM with embedded HR, payroll, projects, " +
      "and support modules for a mid-sized investment-services firm. The system is multi-tenant by " +
      "organization and serves roughly two dozen first-class user roles."
  ),

  S.h2("1.2 Audience"),
  S.body(
    "Engineers who will read, write, review, or operate the system. Familiarity with React, " +
      "TypeScript, SQL, and modern Node tooling is assumed. No prior knowledge of the business " +
      "domain (Indian payroll, mutual fund onboarding, etc.) is assumed — those concepts are " +
      "introduced inline as they appear."
  ),

  S.h2("1.3 How to read this document"),
  S.bullet(
    "Sections 2 and 3 give you the 30,000-foot view: what the product does and which technologies " +
      "build it. Skim if you are familiar with Next.js + Drizzle + TanStack Query."
  ),
  S.bullet(
    "Section 4 maps the repository so you can navigate by file path. Pair this with your IDE's " +
      "open-folder view."
  ),
  S.bullet(
    "Sections 5 and 6 define the architectural layers and the request lifecycle. These are " +
      "the most important sections for code review — most ambiguity in this codebase reduces to " +
      "“which layer should this code live in?”"
  ),
  S.bullet(
    "Sections 7 through 14 give a layered tour of authentication, authorization, the database, " +
      "async messaging, caching, observability, security, and deployment."
  ),
  S.bullet(
    "Sections 15 and 16 cover the testing strategy and known architectural debt — critical " +
      "context before proposing a refactor."
  ),
  S.bullet("Appendices A–C are reference material: glossary, external services, naming conventions."),

  S.h2("1.4 Conventions"),
  S.bodyMixed([
    S.plain("Code identifiers are in monospace, e.g. "),
    S.inlineCode("getAuthenticatedMember()"),
    S.plain(". File paths are written from the repo root, e.g. "),
    S.inlineCode("server/queries/hr/payroll.ts"),
    S.plain(
      ". Drizzle table names use camelCase in TypeScript and snake_case in SQL; we cite " +
        "whichever form is appropriate for the context. Trailing slashes denote directories."
    ),
  ]),
  S.body(
    "Where two equally good alternatives exist (e.g. server actions vs. route handlers), this " +
      "document states the project’s default and the rationale; deviations are flagged."
  ),
];

const productOverview = [
  S.pageBreak(),
  S.h1("2. Product Overview"),

  S.h2("2.1 What the system does"),
  S.body(
    "The Vaivamm Capital CRM is an internal operational platform. It is not a customer-facing " +
      "product. Employees of Vaivamm Capital sign in and use it to run the business: capturing " +
      "leads, converting them to client accounts, onboarding investments, tracking deals, " +
      "running the HR cycle (onboarding, attendance, leave, performance, payroll, exit), " +
      "managing internal projects and support tickets, and communicating via an embedded chat."
  ),
  S.body(
    "The product is multi-tenant: every business object is scoped by an organization id. In " +
      "practice the company runs a single tenant in production today, but the schema and access " +
      "controls have been built to support many. A small set of routes are publicly accessible " +
      "for unauthenticated visitors (the careers page and templated landing pages); everything " +
      "else requires a signed-in session."
  ),

  S.h2("2.2 User roles"),
  S.body(
    "Roles are defined in lib/constants/roles.ts and stored on the organization_members table. " +
      "Every authenticated request is associated with exactly one role per organization. The full " +
      "role list is enumerated below; capability matrices live in the Authentication & Authorization " +
      "document."
  ),
  S.buildTable(
    [2400, 6960],
    ["Role", "Typical responsibilities"],
    [
      ["CEO", "Top-level approvals (payroll, terminations, promotions). Read-only on most operational data."],
      ["ADMIN", "Full system administration. Treated as equivalent to CEO for most authorization checks."],
      ["HR", "Owns the HR module: onboarding, attendance, leave, payroll, exit. Approves expenses up to a limit."],
      ["SALES", "Owns leads and the early sales pipeline. Sees only leads they own unless promoted."],
      ["CUSTOMER_SUPPORT", "Owns post-conversion client accounts. Drives onboarding to investment."],
      ["ENGINEERING", "Project and ticket management. Default fallback role for new developer accounts."],
      ["MANAGER", "Generic line-manager role used for approvals (leave, expenses) over their direct reports."],
    ]
  ),
  S.caption("Selected roles. The full enum is in lib/constants/roles.ts and includes additional finance-side roles."),

  S.h2("2.3 Module breakdown"),
  S.body(
    "The product surface is composed of nine top-level modules. Each maps to a route group, a " +
      "group of database tables, a server query module, and a TanStack Query hook bundle. The " +
      "table below names them and points to the dedicated documentation in this set."
  ),
  ...S.figure("diag-modules.png", "Figure 2-1 — Top-level modules and the dedicated documents that cover each."),
  S.buildTable(
    [2400, 4960, 2000],
    ["Module", "Scope", "See document"],
    [
      ["CRM", "Leads, deals, client accounts, contacts, campaigns, opportunities", "Doc 6"],
      ["HR", "Employees, attendance, leave, holidays, performance, exit", "Doc 5"],
      ["Payroll", "Salary structures, payslips, statutory deductions, OT, advances", "Doc 5"],
      ["Projects", "Projects, sprints, tickets, comments, time tracking", "Doc 7"],
      ["Support", "Internal helpdesk and external CSAT surveys", "Doc 7"],
      ["Auth & Org", "Sessions, MFA, roles, member management, security policy", "Doc 4"],
      ["Settings", "Organization profile, billing, custom fields, integrations", "Doc 4"],
      ["Notifications", "In-app, email, push (Web Push), Ably realtime channels", "Doc 1 (here)"],
      ["Reports", "Sales dashboards, payroll reports, attendance, monthly recap", "Doc 6, Doc 5"],
    ]
  ),
];

const stack = [
  S.pageBreak(),
  S.h1("3. Technology Stack"),
  S.body(
    "All versions are pinned in package.json. This section gives the rationale for each major " +
      "choice and the canonical entry point in the codebase. Where alternatives were considered, " +
      "the relevant ADR (when one exists) is cited."
  ),

  S.h2("3.1 Runtime & framework"),
  S.bodyMixed([
    S.bold("Next.js 16 App Router. "),
    S.plain(
      "Server-rendered pages are the default; ‘use client’ is reserved for components that need " +
        "browser-only APIs (forms, state, Tiptap editor, drag-and-drop). The framework owns routing, " +
        "rendering, and code splitting. Configuration is in "
    ),
    S.inlineCode("next.config.ts"),
    S.plain(", which also defines security headers (CSP, HSTS) and the Sentry build-time wrapper."),
  ]),
  S.bodyMixed([
    S.bold("Node 20+. "),
    S.plain(
      "Required by Next 16 and several deps. Vercel runs the production build on the Node runtime. " +
        "A handful of API routes set "
    ),
    S.inlineCode("export const runtime = \"nodejs\""),
    S.plain(" explicitly to use the Node runtime where Edge would be unsafe (Drizzle, sharp, qpdf)."),
  ]),
  S.bodyMixed([
    S.bold("TypeScript 5. "),
    S.plain(
      "Strict mode. The "
    ),
    S.inlineCode("@typescript-eslint/no-explicit-any"),
    S.plain(
      " rule is set to error; existing violations are ratcheted out via inline disables. New " +
        "code must not introduce "
    ),
    S.inlineCode("any"),
    S.plain(" without an inline justification."),
  ]),

  S.h2("3.2 Database"),
  S.bodyMixed([
    S.bold("PostgreSQL on NeonDB. "),
    S.plain(
      "Serverless Postgres in the US region. Connection is established in "
    ),
    S.inlineCode("lib/db.ts"),
    S.plain(" using the "),
    S.inlineCode("postgres"),
    S.plain(" driver behind Drizzle’s relational query builder."),
  ]),
  S.bodyMixed([
    S.bold("Drizzle ORM. "),
    S.plain(
      "Schema definitions live in "
    ),
    S.inlineCode("lib/db/schema/"),
    S.plain(
      ", broken into namespaces: auth, hr, crm, projects, marketing, enums. Migrations are " +
        "checkpointed under "
    ),
    S.inlineCode("drizzle/"),
    S.plain(
      " (115 versioned files at time of writing). Drizzle’s relational query API is preferred " +
        "over the SQL builder where joins exist."
    ),
  ]),

  S.h2("3.3 Frontend"),
  S.bullet("React 19 with React Server Components. Server components fetch via the queries layer; client components fetch via TanStack Query."),
  S.bullet("TanStack Query v5 for client-side data with optimistic updates. Cache keys are centralized in lib/query-keys.ts."),
  S.bullet("Radix UI primitives composed via a local design system (shadcn/ui style). Components live in components/ui/ and are not edited from the published shadcn registry."),
  S.bullet("Tailwind CSS v4 with an OKLCH color system and CSS variables for theming."),
  S.bullet("React Hook Form + Zod for forms; useForm + zodResolver pattern is universal."),
  S.bullet("framer-motion for incidental animations. Heavy components (drawers, sheets) are lazy-loaded."),
  S.bullet("Tiptap for rich-text editing in policy documents and ticket descriptions."),
  S.bullet("Recharts for analytics dashboards."),

  S.h2("3.4 Authentication"),
  S.bodyMixed([
    S.bold("NextAuth v5 (Auth.js). "),
    S.plain("Credentials provider plus optional Google OAuth. Sessions are JWT-based; the auth secret rotates per environment. The full configuration is in "),
    S.inlineCode("lib/auth/index.ts"),
    S.plain(". MFA is implemented via TOTP (otplib) with backup codes."),
  ]),

  S.h2("3.5 Async & realtime"),
  S.bullet("Inngest for background jobs (event-driven). Functions live in lib/inngest/functions/."),
  S.bullet("Ably for realtime channels — chat messages, ticket updates, notification fanout."),
  S.bullet("Web Push (VAPID) for browser push notifications, configured per user device."),
  S.bullet("Vercel Cron for scheduled work that does not warrant Inngest (e.g. nightly attendance auto-checkout). Cron entries are declared in vercel.json."),

  S.h2("3.6 Observability"),
  S.bullet("Sentry (@sentry/nextjs) for error tracking and performance traces. 10% trace sample, replay-on-error only. Config files are sentry.client/server/edge.config.ts."),
  S.bullet("Custom logger at lib/logger.ts wraps console with structured JSON in production. Logs are surfaced via Vercel’s log drain."),
  S.bullet("Audit log table records sensitive actions (lib/audit-log.ts)."),

  S.h2("3.7 External integrations"),
  S.buildTable(
    [2400, 4000, 2960],
    ["Service", "Used for", "Wrapper"],
    [
      ["SendGrid", "Transactional email (preferred provider).", "lib/email/* + lib/email-templates/*"],
      ["SMTP fallback", "When SendGrid is disabled or rate-limited.", "lib/email/smtp.ts"],
      ["AWS S3 / R2", "Document, avatar, attachment storage.", "lib/storage.ts"],
      ["Razorpay", "Subscription billing (organizations).", "lib/integrations/razorpay/*"],
      ["Twilio", "Optional SMS for OTP fallback.", "lib/twilio.ts"],
      ["Google Generative AI", "Lead scoring, draft email generation, summaries.", "lib/ai/*"],
      ["OpenAI", "Heavier AI tasks (LangChain workflows).", "lib/ai/*"],
      ["Upstash Redis", "Distributed rate limiting + lightweight cache.", "lib/redis.ts, lib/rate-limit*.ts"],
      ["Inngest", "Event-driven background jobs.", "lib/inngest/*"],
      ["Ably", "Realtime channels.", "lib/ably.ts"],
    ]
  ),
];

const repoLayout = [
  S.pageBreak(),
  S.h1("4. Repository Layout"),
  S.body(
    "The repository is a single Next.js application with no monorepo. The directories below are " +
      "ordered by how often new code lands in them. A new engineer’s first 80% of the work happens " +
      "in app/, components/, features/, server/, and lib/."
  ),

  S.h2("4.1 Top-level directories"),
  S.buildTable(
    [2200, 7160],
    ["Path", "Contents"],
    [
      ["app/", "Next.js App Router. Route handlers, server-rendered pages, layouts, error boundaries."],
      ["components/", "Reusable presentation-only UI primitives (cards, inputs, dialogs, charts)."],
      ["features/", "Domain-coupled UI compositions: HR forms, CRM kanbans, project boards. May import from components/."],
      ["server/", "Server-only data access. queries/, actions/, repos/. Never imported from client components."],
      ["lib/", "Cross-cutting utilities: auth, db, email, ai, validations, hooks, constants. The biggest folder by file count."],
      ["hooks/", "Reusable React hooks not specific to a domain (e.g. useDebounce, useMediaQuery)."],
      ["types/", "Hand-maintained TypeScript types layered on top of Drizzle inferred types."],
      ["drizzle/", "Versioned SQL migrations and the meta journal. Generated by drizzle-kit; one entry per change."],
      ["scripts/", "One-shot Node scripts: seeders, backfills, doc generators, email tests."],
      ["public/", "Static assets served at the site root (logo, favicon, push worker)."],
      ["docs/", "Markdown docs and the .docx output folder for this documentation set."],
      [".github/workflows/", "CI pipelines: type check, lint, tests, build, PR gates."],
    ]
  ),

  S.h2("4.2 Inside app/"),
  S.body(
    "Route groups partition the URL tree without leaking into the path. Three groups are in use: " +
      "(auth) for sign-in / sign-up / password recovery, (dashboard) for the authenticated " +
      "application shell, and (public) for unauthenticated visitor pages. The api/ directory holds " +
      "REST-style route handlers; nothing outside api/ should export HTTP handlers."
  ),
  S.buildTable(
    [3000, 6360],
    ["Path under app/", "Purpose"],
    [
      ["(auth)/", "Sign-in, sign-up, password reset, MFA enrolment."],
      ["(dashboard)/", "All authenticated pages. Layout enforces auth via middleware + server-side check."],
      ["(public)/", "Careers list/detail, templated landing pages. Server-rendered, no auth."],
      ["api/", "Route handlers. Subdivided by module: api/hr, api/crm, api/projects, api/notifications, etc."],
      ["api/inngest/route.ts", "The Inngest webhook entry point. All registered functions are dispatched here."],
      ["api/auth/[...nextauth]/", "NextAuth handler."],
      ["error.tsx, not-found.tsx, global-error.tsx", "Global error boundaries. global-error reports to Sentry."],
      ["instrumentation.ts", "Server bootstrap. Wires Sentry on Node and Edge runtimes."],
    ]
  ),

  S.h2("4.3 Inside server/"),
  S.body(
    "server/ is the single source of truth for data access on the backend. Files here import 'server-only' " +
      "to make accidental client imports a build error. The directory has three sub-layers, each with a " +
      "specific responsibility."
  ),
  S.bulletMixed([
    S.bold("server/queries/ — "),
    S.plain("read-side data access. Module-scoped: hr.ts, crm-clients.ts, projects.ts, etc. Each file exports a set of pure async functions returning shapes the API and pages render."),
  ]),
  S.bulletMixed([
    S.bold("server/actions/ — "),
    S.plain("write-side server actions, invoked from client components via the React server-action mechanism. Domain-scoped (leave-actions/, expense-actions/, hr-actions.ts, …)."),
  ]),
  S.bulletMixed([
    S.bold("server/repos/ — "),
    S.plain("the canonical 'load X with relations' shape per resource (clients, leads, deals, employees, payroll, attendance). Adopted opportunistically — newer code prefers repos to avoid the join-shape drift that the older queries layer suffered from."),
  ]),

  S.h2("4.4 Inside lib/"),
  S.body(
    "The largest single folder. Engineers should look here before writing a new utility — duplication is the most common comment on PRs that touch lib/. Subdirectories that already exist:"
  ),
  S.buildTable(
    [2200, 7160],
    ["Folder", "Contents"],
    [
      ["lib/auth/", "NextAuth config, session helpers, role guards, requireAuth wrapper for server actions."],
      ["lib/db/", "Drizzle client, schema (subdivided into auth/hr/crm/projects/enums), migrations metadata."],
      ["lib/api/", "API helpers (withAuth, ok, err, parseBody) and the TanStack Query hook tree."],
      ["lib/email/, lib/email-templates/", "SendGrid + SMTP transports and the HTML template bank organized by module."],
      ["lib/ai/", "Generative AI prompt builders, model wrappers, lead scoring."],
      ["lib/inngest/", "Client + dispatch + functions/ (each file is one Inngest function)."],
      ["lib/integrations/", "Razorpay, biometric, calendar, Slack."],
      ["lib/validations/", "Zod schemas shared between routes, server actions, and forms."],
      ["lib/hr/", "Pure-function HR helpers: payroll calculations, payslip-password derivation, leave policy."],
      ["lib/rbac/", "Role-based access helpers (manager-of, admin-of)."],
      ["lib/utils/, lib/notifications/, lib/pdf/, lib/esign/, lib/export/", "Self-explanatory."],
    ]
  ),

  S.h2("4.5 features/ vs components/"),
  S.body(
    "Both folders contain UI. The split is by reuse and coupling: components/ holds primitives reused " +
      "across the app (Button, Dialog, Sheet, KanbanColumn). features/ holds compositions tied to a " +
      "specific module (e.g. features/hr/payroll/generate-payroll-sheet.tsx is only meaningful in the " +
      "HR module). Anything that imports from server/ or talks to a domain-specific hook belongs in " +
      "features/. If you are tempted to put a domain-specific component in components/ — don't."
  ),

  S.h2("4.6 Tests"),
  S.body(
    "Unit tests are colocated next to the implementation file with the .test.ts suffix. Vitest " +
      "discovers them via the include glob in vitest.config.ts. Today the test suite is concentrated " +
      "in lib/hr/ (payroll calculator, payslip-password derivation). Coverage of routes and " +
      "server actions is a known gap, called out in Section 16."
  ),
];

const layers = [
  S.pageBreak(),
  S.h1("5. Architectural Layers"),
  S.body(
    "Most ambiguity in code review reduces to: which layer should this code live in? The decision " +
      "tree below is the canonical answer. Layers are listed in the order a request flows through them."
  ),
  ...S.figure("diag-layers.png", "Figure 5-1 — The seven layers a request crosses, top to bottom. Color groups: yellow = client, navy = HTTP/auth, green = data, gray = storage."),
  S.infoBox("note", "The repository layer is opt-in today. New resources should adopt the repo pattern from day one; existing resources migrate opportunistically."),

  S.h2("5.1 Edge: middleware"),
  S.body(
    "Every request hits middleware.ts before the matching route handler. Middleware is the first " +
      "and only place to enforce: rate limiting, bot/IP allowlisting, redirect on missing auth, " +
      "force-password-change banner, MFA gating, and coarse-grained role routing. Middleware " +
      "should never read the database directly — its job is to parse the request and either pass " +
      "or short-circuit. The full middleware is fewer than 320 lines today and should stay close " +
      "to that size."
  ),

  S.h2("5.2 Routing: app/ vs api/"),
  S.body(
    "Pages under app/(...) render server components and client components together; route handlers " +
      "under app/api/.../route.ts return JSON. Pages and route handlers must not duplicate logic — " +
      "shared logic belongs in server/queries/ or server/actions/. A page that needs the same data " +
      "as a route should call the same query function."
  ),

  S.h2("5.3 Mutations: route handlers vs server actions"),
  S.body(
    "Both invoke the database. The choice is determined by the caller, not the operation:"
  ),
  S.bullet("Route handlers (POST/PATCH/DELETE under app/api/) are used when the caller is a TanStack mutation hook. This covers the vast majority of mutations today."),
  S.bullet("Server actions (in server/actions/, marked with 'use server') are used when the caller is a form submitted directly via the React server-action mechanism — typically simple HR forms (request leave, submit expense)."),
  S.body(
    "There is intentional overlap for projects, organization, and expenses: the same domain has " +
      "both a route and a server action. This is acknowledged debt, not a feature. New code should " +
      "pick one — preferably the route handler — and the duplicates should converge over time."
  ),

  S.h2("5.4 Reads: server/queries/"),
  S.body(
    "Pure async functions returning data shapes ready to render. No HTTP. No request object. " +
      "Every function takes the org id (and often the user id) as its first arguments — they do " +
      "not extract these from a session. That separation makes them callable from both pages and " +
      "API routes without re-deriving the session in different ways."
  ),

  S.h2("5.5 Reads (canonical): server/repos/"),
  S.body(
    "Repos exist to remove join-shape drift. When two server/queries/ files both want to load " +
      "client accounts with sales rep + assigned CS member, they used to write the with: { ... } " +
      "block twice and it diverged. The repo owns that shape; queries/ wraps it for filters/" +
      "pagination/aggregation. Today the repo layer covers 6 resources: clients, leads, deals, " +
      "employees, payroll, attendance. New resources should adopt the repo pattern from day one."
  ),

  S.h2("5.6 Writes: Drizzle"),
  S.body(
    "All writes go through the Drizzle client (lib/db.ts) using either the relational API " +
      "(db.query.<table>.findFirst/findMany) or the SQL builder (db.insert/.update/.delete). The " +
      "schema lives in lib/db/schema/ split by namespace. Relations are declared in the same file " +
      "as the table; cross-file relations are imported by name."
  ),
  S.body(
    "Transactions wrap multi-table writes (db.transaction(async (tx) => …)). Soft delete is " +
      "implemented via deleted_at columns on the tables that have one — leads, clients, projects, " +
      "documents. Filtering must include isNull(table.deletedAt) or rely on a wrapping query."
  ),

  S.h2("5.7 Client data: TanStack Query"),
  S.body(
    "Client components fetch via hooks under lib/api/hooks/. The hooks call the apiClient (a thin " +
      "fetch wrapper at lib/api-client.ts). Cache keys are constructed via the queryKeys factory " +
      "in lib/query-keys.ts; do not hand-roll arrays. Optimistic updates are used for kanban drag-" +
      "and-drop and ticket comment edits — see lib/mutation-utils.ts for the helper."
  ),
];

const lifecycle = [
  S.pageBreak(),
  S.h1("6. Request Lifecycle"),
  S.body(
    "Three canonical request paths exist: server-rendered page, JSON API, and server action. The " +
      "next sections trace each one end-to-end with the file each step lives in."
  ),
  ...S.figure("diag-lifecycle.png", "Figure 6-1 — Sequence diagram for a typical leave-request submission. Same shape applies to most JSON API mutations."),

  S.h2("6.1 Server-rendered page"),
  ...S.code(
    `Browser
  → Vercel edge
  → middleware.ts            (rate limit, auth gate, role check)
  → app/(dashboard)/.../page.tsx  (RSC)
       │
       ├─ getServerSession()  →  lib/auth/index.ts
       │
       └─ getXxx(orgId, userId)  →  server/queries/xxx.ts
                                     │
                                     └─ db.query.xxx.findMany()  →  Postgres (Neon)
       │
       └─ <ChildClient ... />  (re-hydrated on the client)
                                ├─ TanStack hook for any client-side fetches
                                └─ Renders, optionally registers Ably channel`
  ),

  S.h2("6.2 JSON API request"),
  ...S.code(
    `Browser fetch / TanStack mutation
  → Vercel edge
  → middleware.ts
  → app/api/<area>/<route>/route.ts
       │
       ├─ withAuth(async (session) => {…})    →  lib/api/helpers.ts
       │     │
       │     └─ auth() + organization member lookup
       │
       ├─ parseBody(req, zodSchema)            →  validated input
       │
       ├─ business logic
       │     │
       │     ├─ db.query.* / db.insert.* / …
       │     └─ optional Inngest event       →  lib/inngest/client.ts
       │
       └─ return ok(data) | err(message, status)`
  ),

  S.h2("6.3 Server action"),
  ...S.code(
    `<form action={createExpense}>
  → React invokes the server action transparently
  → server/actions/expense-actions/expense-crud.ts
       │
       ├─ requireAuth(['HR','MANAGER'])     →  lib/auth/require-auth.ts
       ├─ Zod parse
       ├─ db.insert.expenses.values(...).returning()
       └─ revalidatePath('/hr/expenses')`
  ),

  S.h2("6.4 Async event flow"),
  S.body(
    "Some mutations enqueue an event rather than block on a slow side-effect. A typical example is " +
      "lead conversion: the PATCH handler creates the client account inline (the user must see it) " +
      "and emits an Inngest event for notification fanout (which can take seconds)."
  ),
  ...S.code(
    `route.ts:                 db.insert(clientAccounts)…
                          inngest.send({ name: 'crm/lead.converted', data: {...} })

inngest function:        receives event
                          loads CSM, manager, sales rep
                          send 3 emails in parallel
                          create 3 in-app notifications
                          publish to Ably channel`
  ),
];

const auth = [
  S.pageBreak(),
  S.h1("7. Authentication"),
  ...S.figure("diag-auth-flow.png", "Figure 7-1 — Authentication state machine. Failure paths (5 wrong attempts → lock-out) lead to the operations runbook for unlock procedure."),

  S.h2("7.1 NextAuth configuration"),
  S.bodyMixed([
    S.plain("The auth setup is at "),
    S.inlineCode("lib/auth/index.ts"),
    S.plain(
      ". A credentials provider validates email + password against the users table (passwords " +
        "are bcrypt hashed). An optional Google OAuth provider is enabled when the corresponding env " +
        "vars are present. Sessions are JWT-based with a 30-day expiry."
    ),
  ]),

  S.h2("7.2 Session shape"),
  S.body(
    "The session callback augments the default NextAuth session with the user’s organization id, " +
      "role, MFA-enrolment flag, and account-locked flag. Every server-side handler that needs the " +
      "session unwraps it via getServerSession() (or auth() in newer code)."
  ),
  ...S.code(
    `interface Session {
  user: {
    id: string;
    email: string;
    name?: string;
    role: Role;
    mfaEnabled: boolean;
    isActive: boolean;
  };
  orgId: string;
  expires: ISODateString;
}`
  ),

  S.h2("7.3 MFA"),
  S.body(
    "TOTP-based, implemented with otplib. Users enroll a device, scan a QR, and confirm one code. " +
      "Backup codes are generated server-side, hashed, and stored alongside the user record. MFA is " +
      "optional per user but can be force-enabled by org-level security policy."
  ),

  S.h2("7.4 Session helpers"),
  S.bullet("getAuthenticatedMember() — returns { session, member, isAdmin, userId, orgId } or { error }. The single source for resolving 'who is calling'."),
  S.bullet("ensureOrgMembership() — auto-provisions a member row if a signed-in user has no organization yet. Used during onboarding."),
  S.bullet("isAdminOrOwner(role), isCEO(role), isExpenseAdmin(role) — pure predicates safe to import from client components."),
];

const authz = [
  S.pageBreak(),
  S.h1("8. Authorization"),
  S.body(
    "Authorization is layered. The closer you are to the data, the stricter the check. No layer " +
      "can be removed — middleware can fail open under load, withAuth handles only HTTP auth, and " +
      "row-level checks need the actual record fields."
  ),

  S.h2("8.1 Layer 1 — middleware"),
  S.body(
    "Middleware enforces 'is this URL even allowed for this role?'. The route table maps URL " +
      "prefixes to allowed roles. A SALES user requesting /hr/payroll is bounced to /403 before " +
      "the page handler runs. Middleware never reads the body."
  ),

  S.h2("8.2 Layer 2 — withAuth (route handlers)"),
  S.bodyMixed([
    S.plain("Every route handler must wrap its body in "),
    S.inlineCode("withAuth(async (session) => …)"),
    S.plain(". The wrapper:"),
  ]),
  S.bullet("Resolves the session and the org member."),
  S.bullet("Returns 401 if no session, 403 if no org membership."),
  S.bullet("Provides typed session.orgId and session.user to the body."),
  S.bullet("Catches uncaught exceptions and returns 500 with a sanitized error."),
  S.body(
    "There is also withAdmin (shorthand for withAuth + isAdminOrOwner check). Avoid hand-rolling " +
      "auth checks in routes — every regression we have shipped in this area was a hand-rolled check."
  ),

  S.h2("8.3 Layer 3 — requireAuth (server actions)"),
  S.body(
    "Server actions cannot use withAuth (it returns a Response). They use requireAuth(roles?) " +
      "from lib/auth/require-auth.ts which mirrors withAuth’s contract but returns a discriminated " +
      "result the action body can pattern-match on."
  ),

  S.h2("8.4 Layer 4 — row-level checks"),
  S.body(
    "Inside a query/route, every database read or write must include orgId in its WHERE clause. " +
      "Drizzle does not provide multi-tenant isolation by default; missing the orgId filter is the " +
      "single most-common security regression in this codebase. Every server/queries/* function " +
      "takes orgId as its first argument as a forcing function."
  ),
  S.infoBox("caution", "If a code review finds a db query without an orgId filter, treat it as a P1 bug, not a style nit. Past incidents tracing to this exact mistake account for every cross-tenant data exposure we have remediated."),

  S.h2("8.5 Resource ownership"),
  S.body(
    "Some resources have stricter visibility than the org boundary: a SALES user only sees the " +
      "leads assigned to them; a CUSTOMER_SUPPORT user only sees the client accounts they own. " +
      "These row-level filters live inside the query function and key off session.user.role."
  ),
];

const dataLayer = [
  S.pageBreak(),
  S.h1("9. Database Layer"),

  S.h2("9.1 Connection"),
  S.bodyMixed([
    S.plain("A single Drizzle client is constructed in "),
    S.inlineCode("lib/db.ts"),
    S.plain(
      " using the postgres driver. The connection string comes from DATABASE_URL. Connection " +
        "pooling is delegated to NeonDB; we do not pool client-side. Re-using one Drizzle client " +
        "across requests is safe because postgres-js uses a single TCP connection per process."
    ),
  ]),

  S.h2("9.2 Schema organization"),
  S.body(
    "Schema files split by namespace. The HR namespace alone has roughly 89 tables; the CRM " +
      "namespace has roughly 66. Each namespace’s _all.ts is the canonical file; sub-files re-export " +
      "subsets for navigation. Cross-namespace foreign keys (e.g. expenses.projectId → projects.id) " +
      "are imported by name."
  ),
  ...S.figure("diag-schema-overview.png", "Figure 9-1 — Schema namespaces. Doc 3 covers each table individually."),
  S.buildTable(
    [3000, 6360],
    ["Schema namespace", "Major tables"],
    [
      ["auth", "users, accounts, sessions, organizations, organizationMembers, userSessions"],
      ["hr/employees", "departments, departmentMembers, candidates, jobPostings, interviews"],
      ["hr/payroll", "payrolls, salaryStructures, salaryRevisionHistory, bonuses, salaryLoans, fnfSettlements"],
      ["hr/attendance", "attendance, leaveTypes, leaveBalances, leaveRequests, holidays, wfhRequests, holidayWorkRequests, compOffGrants"],
      ["hr/performance", "reviewCycles, performanceReviews, appraisals, pip*, goals, oneOnOneMeetings, training*"],
      ["hr/exit", "resignations, terminations, exitChecklists, alumniProfiles, backgroundVerifications"],
      ["hr/operations", "expenses, assets, documents, recognitions, teamEvents, pulseSurveys, helpdeskTickets, …"],
      ["crm/leads", "leads, leadActivities, leadNotes, leadTasks, leadEmails, leadScoringRules, …"],
      ["crm/accounts", "clients, clientAccounts, clientAccountActivities, contacts, crmOrganizations, branches"],
      ["crm/deals", "deals, dealActivities, dealMeetings, dealApprovalRules, quotes, …"],
      ["crm/marketing", "crmCampaigns, emailCampaigns, emailCampaignRecipients, socialMediaStats"],
      ["crm/support", "supportTickets, supportTicketMessages, csatSurveys, csatResponses, crmSla"],
      ["projects", "projects, sprints, tickets, ticketComments, ticketAttachments, …"],
      ["marketing", "landingPages (public-facing) — separate file."],
    ]
  ),

  S.h2("9.3 Migrations"),
  S.body(
    "Migrations live in drizzle/ and are versioned by a 4-digit prefix. They are generated by " +
      "drizzle-kit (npm run db:generate) and applied with drizzle-kit migrate (npm run db:migrate). " +
      "Direct push (db:push) is reserved for local-only experimentation; production goes via " +
      "migrate so the journal stays consistent."
  ),
  S.body(
    "Migration discipline: additive only. Add nullable columns with defaults; never drop columns " +
      "in the same release that removes the code referencing them; index changes go in their own " +
      "migration; CONCURRENTLY where possible. Two migrations in the history are explicit drift fixes " +
      "(0015 and 0024 — fix_schema_drift). They are historical artifacts of an earlier db:push era; " +
      "do not introduce more of them."
  ),

  S.h2("9.4 Indexes"),
  S.body(
    "Indexes are declared inline on each pgTable definition. Every foreign key column that " +
      "appears in a WHERE clause should be indexed. Composite indexes (orgId, status) are " +
      "preferred over two single-column indexes when the filter is always a pair. Missing indexes " +
      "tend to surface as slow Vercel function logs; check the EXPLAIN before adding one to make " +
      "sure Postgres actually uses it."
  ),

  S.h2("9.5 Soft delete"),
  S.body(
    "Tables that need recoverable deletion carry a deleted_at timestamp column. Their relations " +
      "filter on isNull(table.deletedAt). Hard delete is reserved for ephemeral data (sessions, " +
      "rate-limit tokens). Audit-relevant rows (payrolls, appraisals) are never deleted; status " +
      "changes are appended."
  ),
];

const asyncLayer = [
  S.pageBreak(),
  S.h1("10. Async & Realtime"),

  S.h2("10.1 Inngest"),
  S.body(
    "Functions register themselves on import. The route handler at app/api/inngest/route.ts " +
      "exposes the Inngest webhook. Events are typed in lib/inngest/client.ts under the " +
      "InngestEvents map; producers call inngest.send({ name, data }) and consumers declare " +
      "their handler with inngest.createFunction({ id, … }, { event }, async ({ event }) => …)."
  ),
  S.body(
    "Use Inngest for: any side-effect that takes >500 ms (email fanout, PDF generation), any " +
      "side-effect that the user does not need to wait for (notifications), and any side-effect " +
      "that should retry on failure (webhook delivery)."
  ),

  S.h2("10.2 Ably"),
  S.body(
    "Ably channels carry chat messages and notification fanout. Server-side publishing happens " +
      "in lib/ably.ts; client-side subscription happens in features/chat/* and the global " +
      "notification provider. Channel naming convention: <namespace>:<orgId>:<entityId>, e.g. " +
      "chat:org_abc:channel_42."
  ),

  S.h2("10.3 Web Push"),
  S.body(
    "VAPID-based browser push. Subscriptions are stored on user_devices. Outgoing pushes are " +
      "dispatched from Inngest functions or directly from route handlers. The service worker is " +
      "served from public/sw.js. Push is opt-in per user; permission UI lives in account settings."
  ),

  S.h2("10.4 Cron"),
  S.body(
    "Scheduled jobs declared in vercel.json. Common ones: nightly attendance auto-checkout, " +
      "weekly project report, monthly expense report, payroll cycle nudges, holiday reminders. " +
      "Each cron route at app/api/cron/... requires the CRON_SECRET header to authenticate."
  ),
];

const caching = [
  S.pageBreak(),
  S.h1("11. Caching"),

  S.h2("11.1 TanStack Query"),
  S.body(
    "Client-side cache keyed by queryKeys.<module>.<resource>(args). staleTime defaults are tuned " +
      "per resource (e.g. employees: 60 s, payroll: 0 — always fresh). Mutations invalidate " +
      "their dependents via qc.invalidateQueries({ queryKey: queryKeys.<module>.all })."
  ),

  S.h2("11.2 React server cache"),
  S.body(
    "Server components use React.cache() for per-request memoization (e.g. session lookup is " +
      "called by both layout and page; the result is shared)."
  ),

  S.h2("11.3 Upstash Redis"),
  S.body(
    "Used for two things: distributed rate limiting (Upstash Ratelimit + sliding window) and " +
      "lightweight cross-request cache (e.g. throttling repeated email sends). Reach for it " +
      "sparingly; database queries with proper indexes are usually fast enough."
  ),
];

const observability = [
  S.pageBreak(),
  S.h1("12. Observability"),

  S.h2("12.1 Sentry"),
  S.body(
    "Sentry is initialized in three contexts: client (browser bundle), server (Node), and edge. " +
      "Each context has its own DSN-aware init in sentry.<context>.config.ts. Errors flow through " +
      "the global error boundary at app/global-error.tsx (which wraps Sentry.captureException). " +
      "The route-error boundary at components/ui/route-error-boundary.tsx mirrors the same pattern."
  ),
  S.body(
    "Performance traces sample at 10%; replay-on-error captures the user’s recent activity for " +
      "thrown errors only. Personal data is masked (replayIntegration.maskAllText: true)."
  ),

  S.h2("12.2 Logger"),
  S.body(
    "lib/logger.ts wraps console with levels: debug, info, warn, error. In production the logger " +
      "emits structured JSON; in development it pretty-prints. Use logger.warn/error for " +
      "operational anomalies — Vercel’s log drain forwards to whatever observability backend is " +
      "configured."
  ),

  S.h2("12.3 Audit log"),
  S.body(
    "Sensitive actions are recorded via createAuditLog(). The audit_logs table stores the actor, " +
      "action, target (id + type), and arbitrary metadata. Examples: lead status change, payroll " +
      "approval, payroll mark-as-paid, user role change."
  ),
];

const security = [
  S.pageBreak(),
  S.h1("13. Security"),

  S.h2("13.1 Headers"),
  S.body(
    "Configured in next.config.ts via the headers() function. CSP allows self + inline-style + " +
      "fonts.googleapis. HSTS is one year with subdomains. X-Frame-Options DENY (we never iframe " +
      "ourselves). Permissions-Policy disables camera/microphone; geolocation is allowed for " +
      "attendance check-in."
  ),

  S.h2("13.2 Rate limiting"),
  S.body(
    "lib/rate-limit-redis.ts wraps Upstash Ratelimit. Auth endpoints, webhook endpoints, and " +
      "expensive analytics endpoints each have their own bucket. Limits live in lib/rate-limit.ts " +
      "as a single config object."
  ),

  S.h2("13.3 Input validation"),
  S.body(
    "Every route handler parses its body via parseBody(req, zodSchema). Server actions parse via " +
      "their argument schema. Forms validate via zodResolver before submitting. The shared schemas " +
      "live in lib/validations/."
  ),

  S.h2("13.4 PII handling"),
  S.bullet("PAN, Aadhaar, bank account numbers — stored at rest, masked in logs, masked on display unless explicitly revealed by HR."),
  S.bullet("Salary structures — visible to HR + CEO; never visible to peers."),
  S.bullet("Payslip PDFs — encrypted on email delivery (qpdf 256-bit AES) when password derivation succeeds."),
  S.bullet("Webhooks (Razorpay, Inngest) — signature-verified; rejected on mismatch."),
];

const deployment = [
  S.pageBreak(),
  S.h1("14. Deployment"),

  S.h2("14.1 Vercel"),
  S.body(
    "The application is deployed to Vercel from the main branch. Production deployments happen " +
      "automatically on push to main; preview deployments are created for every pull request. The " +
      "Vercel project is configured in vercel.json (cron entries) and in the Vercel UI " +
      "(environment variables, domain mapping, Lambda settings)."
  ),

  S.h2("14.2 Environments"),
  S.bullet("local — engineers’ laptops, Postgres on localhost or a Neon dev branch."),
  S.bullet("preview — per-PR Vercel environment, points to a Neon dev branch."),
  S.bullet("production — Vercel main, points to the production Neon branch. No staging."),

  S.h2("14.3 CI gates"),
  S.body(
    "GitHub Actions runs three gates on every PR and main push: pnpm tsc --noEmit, pnpm lint, " +
      "pnpm test, pnpm build. All four must pass; continue-on-error is false on each."
  ),
];

const testing = [
  S.pageBreak(),
  S.h1("15. Testing"),
  S.body(
    "The codebase shipped originally with zero automated tests. As of the May 2026 hardening " +
      "pass, the payroll calculator and payslip-password derivation are covered by Vitest unit " +
      "tests (42 cases). Coverage is run via pnpm test:coverage. There is no integration or e2e " +
      "test suite today; that is on the backlog."
  ),
  S.body(
    "When adding tests: prefer pure-function tests over mocked-database tests. Anything that " +
      "depends on Drizzle’s relational graph is hard to mock and brittle. Refactor the math out " +
      "of the route into a pure helper and test the helper. The payroll calculator " +
      "(lib/hr/payroll-calculations.ts) is the model to copy."
  ),
];

const debt = [
  S.pageBreak(),
  S.h1("16. Known Architectural Debt"),
  S.body(
    "These items are tracked openly. They are not bugs; they are deferred decisions or partial " +
      "migrations. Each is in scope for a future release, but knowing them prevents new code from " +
      "regressing them further."
  ),
  S.bullet("Dual write paths (route handler + server action) for projects, organization, and expenses. New code: pick one. Migration: convergence to route handlers."),
  S.bullet("Drizzle schema split. The HR and CRM schema files are now layered on a canonical _all.ts with domain re-exports. Real per-table splits are deferred until the relations() web is decoupled."),
  S.bullet("Repository layer covers six resources only. The remaining ~40 resources still go via the queries/ layer directly. New code should adopt the repo pattern; existing code migrates opportunistically."),
  S.bullet("Some legacy raw db calls in app/api/organization/* — slated for migration to server/queries/organization."),
  S.bullet("Cursor pagination is available but used by zero callers today. Hot list endpoints (clients, leads, deals) still use offset pagination; migrate when a list crosses ~10k rows."),
  S.bullet("E1 dead-schema audit not yet performed. We know workflow_status was dropped (migration 0016) but a thorough sweep against production data is pending."),
  S.bullet("`as any` count is a single-digit number today (held by ratchet). The remaining cases are third-party type-mismatch fixes; they should not appear in new code."),
];

const appendices = [
  S.pageBreak(),
  S.h1("Appendix A — Glossary"),
  S.buildTable(
    [2400, 6960],
    ["Term", "Meaning"],
    [
      ["Org", "Organization. The top-level multi-tenant boundary."],
      ["Member", "A user’s membership in an org, carrying a role."],
      ["Lead", "A pre-conversion CRM record. Owned by SALES."],
      ["Client account", "Post-conversion record. Owned by CUSTOMER_SUPPORT."],
      ["LOP", "Loss of Pay — unpaid absence days, deducted from payroll."],
      ["HRA", "House Rent Allowance — typically 50% of basic salary."],
      ["PT", "Professional Tax — flat ₹200/month state-mandated deduction in most Indian states."],
      ["PF", "Provident Fund — 12% employee + 12% employer retirement contribution, capped at ₹15k basic."],
      ["ESI", "Employee State Insurance — 0.75% / 3.25% health insurance, applies to gross ≤ ₹21k."],
      ["TDS", "Tax Deducted at Source — monthly income tax withholding. Not yet implemented."],
      ["HWR", "Holiday Work Request — employee-initiated request to work on a Saturday/Sunday/holiday."],
      ["Comp Off", "Compensatory Off — leave granted in exchange for working a holiday."],
      ["Payslip", "PDF salary statement, generated when a payroll moves from APPROVED to PAID."],
      ["FNF", "Full and Final settlement — exit payout."],
      ["RSC", "React Server Component."],
      ["TanStack Query", "Client-side query/mutation cache library, formerly React Query."],
      ["Inngest", "Event-driven background job runner."],
      ["Ably", "Realtime channel service used for chat and notifications."],
      ["NeonDB", "Serverless Postgres provider hosting our database."],
    ]
  ),
  S.pageBreak(),
  S.h1("Appendix B — External services and where they appear"),
  S.buildTable(
    [2200, 3500, 3660],
    ["Service", "Used for", "Code path"],
    [
      ["NeonDB", "Postgres database", "lib/db.ts, DATABASE_URL"],
      ["Vercel", "Hosting, cron, edge runtime", "vercel.json + Vercel UI"],
      ["NextAuth", "Sessions, MFA, OAuth", "lib/auth/index.ts"],
      ["SendGrid", "Email", "lib/email/sendgrid.ts"],
      ["AWS S3 / R2", "File storage", "lib/storage.ts"],
      ["Razorpay", "Subscription billing", "lib/integrations/razorpay/"],
      ["Twilio", "SMS (optional)", "lib/twilio.ts"],
      ["Inngest", "Background jobs", "lib/inngest/, app/api/inngest/route.ts"],
      ["Ably", "Realtime", "lib/ably.ts"],
      ["Upstash Redis", "Rate limit + cache", "lib/redis.ts, lib/rate-limit-redis.ts"],
      ["Google Generative AI", "Lead scoring, AI features", "lib/ai/"],
      ["OpenAI", "LangChain workflows", "lib/ai/"],
      ["Sentry", "Errors, traces", "sentry.*.config.ts, instrumentation.ts"],
    ]
  ),
  S.pageBreak(),
  S.h1("Appendix C — Naming conventions"),
  S.bullet("File names: kebab-case (lib/auth/role-guards.ts, server/queries/crm-clients.ts)."),
  S.bullet("React components: PascalCase exports, kebab-case file names."),
  S.bullet("DB tables: snake_case in SQL, camelCase in Drizzle (snake_case via the column() name argument)."),
  S.bullet("Enums: SCREAMING_SNAKE_CASE for the values (e.g. LeadStatus.ACCOUNT_OPENING)."),
  S.bullet("Server query exports: getXxx (read), createXxx/updateXxx/deleteXxx (write — when in actions/)."),
  S.bullet("TanStack hooks: useXxx (read), useCreateXxx/useUpdateXxx/useDeleteXxx (mutations)."),
  S.bullet("Route handlers: standard HTTP verbs (GET, POST, PATCH, DELETE) — never inline aliases."),
];

// ── Assemble ─────────────────────────────────────────────────────────────────

const doc = new Document({
  creator: "Vaivamm Capital — Engineering",
  title: DOC_TITLE,
  description: "Foundation engineering doc for the Vaivamm Capital CRM.",
  styles: S.styles,
  numbering: S.numbering,
  sections: [
    {
      properties: S.sectionProps(),
      headers: { default: S.buildHeader(DOC_TITLE) },
      footers: { default: S.buildFooter(DOC_NUMBER) },
      children: [
        ...cover,
        ...toc,
        ...intro,
        ...productOverview,
        ...stack,
        ...repoLayout,
        ...layers,
        ...lifecycle,
        ...auth,
        ...authz,
        ...dataLayer,
        ...asyncLayer,
        ...caching,
        ...observability,
        ...security,
        ...deployment,
        ...testing,
        ...debt,
        ...appendices,
      ],
    },
  ],
});

const outDir = path.join(__dirname, "..", "..", "docs", "word-docs");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "01-system-architecture.docx");

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log(`Wrote ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
});
