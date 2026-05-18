// Doc 2 — Developer Onboarding Guide
// docs/word-docs/02-developer-onboarding.docx
const fs = require("fs");
const path = require("path");
const { Document, Packer, TableOfContents } = require("docx");
const S = require("./_styles");

const DOC_NUMBER = "02";
const DOC_TITLE = "Developer Onboarding Guide";

const cover = S.coverPage({
  docNumber: DOC_NUMBER,
  title: DOC_TITLE,
  subtitle: "From git clone to first PR — your first week.",
  audience: "New engineering hires (full-stack)",
  version: "1.0",
  repoSha: process.env.REPO_SHA || "53fbb593",
  date: process.env.DOC_DATE || "May 2026",
});

const toc = [
  S.h1("Table of Contents"),
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-3" }),
  S.pageBreak(),
];

const welcome = [
  S.h1("1. Welcome"),
  S.body(
    "This guide gets you from a clean machine to a green CI build on your first ticket. The " +
      "expectation: by the end of week one you have shipped at least one small fix or refactor to " +
      "a feature branch, opened a pull request, and walked the reviewer through your reasoning. " +
      "Read this end to end before touching the code; everything else in the doc set assumes you " +
      "have."
  ),
  S.body(
    "If anything below is wrong, out of date, or unclear, fix the document — that is itself a " +
      "valid first PR. Documentation that ages out is worse than no documentation. The generator " +
      "for this file lives at scripts/gen-docs/02-onboarding.js."
  ),
];

const prereq = [
  S.pageBreak(),
  S.h1("2. Prerequisites"),

  S.h2("2.1 Hardware"),
  S.bullet("MacBook (M-series strongly preferred) or a Linux laptop with at least 16 GB RAM."),
  S.bullet("Two external displays recommended; the codebase has a wide schema and split-pane review benefits a lot from screen real estate."),
  S.bullet("A reliable internet connection — the dev DB is hosted (Neon), and the dev server reaches Sentry, Inngest, and Ably on every reload."),

  S.h2("2.2 Software"),
  S.body(
    "Install the following before your first day. Versions below are pinned by package.json and " +
      ".nvmrc; mismatches show up as cryptic build errors, so do not freelance with newer majors."
  ),
  S.buildTable(
    [3000, 2000, 4360],
    ["Tool", "Required version", "Install"],
    [
      ["Node.js", "20.x LTS", "Use nvm: `nvm install 20 && nvm use 20`"],
      ["pnpm", "10.x", "`npm install -g pnpm@10` (we lock the major)"],
      ["Postgres client", "Optional", "`brew install postgresql@16` for psql against the Neon dev DB"],
      ["VS Code (or Cursor)", "Latest", "Settings sync our team config; pull from the team Notion"],
      ["GitHub CLI", "Latest", "`brew install gh` — used for the daily PR review flow"],
      ["Docker Desktop", "Optional", "Only needed if you run a local Postgres; we mostly use Neon"],
      ["Vercel CLI", "Latest", "`npm install -g vercel` — needed for preview env vars"],
    ]
  ),

  S.h2("2.3 Accounts you need from IT"),
  S.bullet("GitHub access to the Vibe-Coders-Batch organization."),
  S.bullet("Vercel team membership (read access to project, write access only after probation)."),
  S.bullet("NeonDB read-only credentials for the dev branch (write access via migrations only)."),
  S.bullet("Sentry project access (read events, no write)."),
  S.bullet("Inngest dashboard access (event log + replay)."),
  S.bullet("Linear / GitHub Projects board access for the sprint queue."),
  S.bullet("Notion team space for the engineering wiki and runbooks."),
];

const setup = [
  S.pageBreak(),
  S.h1("3. First-time Setup"),

  S.h2("3.1 Clone the repo"),
  ...S.code(
    `# SSH (preferred — works through corporate proxies)
git clone git@github.com:Vibe-Coders-Batch/vaivamm-capital-crm.git
cd vaivamm-capital-crm

# Or HTTPS
git clone https://github.com/Vibe-Coders-Batch/vaivamm-capital-crm.git`
  ),

  S.h2("3.2 Install dependencies"),
  ...S.code(`pnpm install`),
  S.body(
    "Expect roughly two minutes on a fresh machine. If install hangs on a postinstall script, the " +
      "common cause is sharp downloading platform binaries; rerun with PUPPETEER_SKIP_DOWNLOAD=1 if " +
      "puppeteer was somehow pulled in transitively."
  ),

  S.h2("3.3 Environment variables"),
  S.body(
    "Copy .env.example to .env.local. Fill in only what you need for the area you are working on " +
      "— the app initializes most external services lazily and skips them gracefully when env vars " +
      "are missing. Ask a teammate for the dev secrets via the team password manager; never paste " +
      "them in Slack or email."
  ),
  ...S.code(`cp .env.example .env.local
$EDITOR .env.local`),
  S.body("Minimum set to bring the app up at all:"),
  S.buildTable(
    [3200, 6160],
    ["Variable", "What it does"],
    [
      ["DATABASE_URL", "Neon connection string. Use the dev branch URL, not prod."],
      ["NEXTAUTH_SECRET", "Generate with `openssl rand -base64 32`. Different per developer."],
      ["NEXTAUTH_URL", "http://localhost:3000 in development."],
      ["ENCRYPTION_KEY", "Generate with `openssl rand -hex 32`. Used by the credentials encryption helper."],
      ["NEXT_PUBLIC_APP_URL", "http://localhost:3000."],
      ["GOOGLE_GENERATIVE_AI_API_KEY", "Empty unless you are working on AI features."],
      ["SENDGRID_API_KEY", "Empty unless you are testing email; the SMTP fallback is also fine for dev."],
    ]
  ),
  S.body("Optional but useful when working in their respective modules:"),
  S.buildTable(
    [3200, 6160],
    ["Variable", "Module"],
    [
      ["UPSTASH_REDIS_REST_URL / TOKEN", "Rate limiting + Redis-backed cache."],
      ["INNGEST_EVENT_KEY / SIGNING_KEY", "Background jobs. Ask in #engineering for the dev keys."],
      ["ABLY_API_KEY", "Realtime chat. The app falls back to polling without it."],
      ["R2_* (Cloudflare R2)", "File uploads. Without these, attachments fail with a clear error."],
      ["VAPID_PUBLIC_KEY / PRIVATE_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY", "Web Push. Generate with `npx web-push generate-vapid-keys`."],
      ["NEXT_PUBLIC_SENTRY_DSN", "Sentry. Leave empty in dev unless you are debugging the wrapper itself."],
    ]
  ),

  S.h2("3.4 Database setup"),
  S.body(
    "Two options. Option A (recommended for first day): the shared Neon dev branch. Just paste the " +
      "DATABASE_URL teammate-gives-you and skip to 3.5. Option B: local Postgres if you need to run " +
      "destructive migrations or test failure modes."
  ),
  S.h3("Option A — Neon dev branch"),
  S.bullet("DATABASE_URL points at neondb.io. Read everyone’s data; write your own."),
  S.bullet("Run `pnpm db:migrate` once to ensure your local Drizzle state matches the migration journal."),
  S.bullet("Be considerate — dev branch is shared. Avoid bulk inserts and DROP statements."),
  S.h3("Option B — Local Postgres"),
  ...S.code(
    `# Once
brew install postgresql@16
brew services start postgresql@16
createdb vaivamm_crm

# In .env.local
DATABASE_URL=postgresql://$(whoami)@localhost:5432/vaivamm_crm

# Apply migrations
pnpm db:migrate

# Seed (optional)
pnpm seed:demo`
  ),

  S.h2("3.5 Start the dev server"),
  ...S.code(`pnpm dev`),
  S.body(
    "Open http://localhost:3000. The first compile takes 30–60 seconds; subsequent recompiles are " +
      "incremental. Use Cmd+Shift+R to hard-refresh after touching layout or middleware."
  ),
  S.body(
    "You will land on /signin. Use one of the demo accounts seeded by `pnpm seed:demo` (admin@vaivamm.demo / ChangeMe@123 by default), or create your own via /signup if invitations are enabled in your env."
  ),

  S.h2("3.6 Editor setup"),
  S.bullet("Install the team’s recommended VS Code extensions (workspace recommendations live in .vscode/extensions.json once provisioned). Bare minimum: ESLint, Tailwind CSS IntelliSense, Prettier (or Biome), TypeScript Vue Plugin (for legacy Vue files — none currently), and GitLens."),
  S.bullet("Format on save: ON. Default formatter: ESLint."),
  S.bullet("TypeScript SDK: workspace version (5.x). Cmd+Shift+P → 'TypeScript: Select TypeScript Version' → 'Use Workspace Version'."),
  S.bullet("Tailwind: enable class regex matching for clsx and cva so suggestions show up inside dynamic class strings."),
];

const dailyDev = [
  S.pageBreak(),
  S.h1("4. The Daily Loop"),

  S.h2("4.1 Branching"),
  S.body(
    "We branch from main and merge back via pull request. Branch names follow type/short-summary: " +
      "fix/leave-email-loop, feat/payslip-password, refactor/repo-bootstrap. Avoid your name in " +
      "branch names — branches outlive their authors."
  ),
  S.body(
    "Long-lived hotfix branches (e.g. hotfix/22-april-fixes) carry multiple related fixes; they " +
      "are an exception, not a pattern. New features branch fresh from main."
  ),

  S.h2("4.2 Commit style"),
  S.body(
    "Conventional Commits. The first line is `type(scope): summary` in present tense. Body wraps " +
      "at 72 characters and explains why, not what (the diff explains what). Examples:"
  ),
  ...S.code(
    `feat(payroll): pro-rate salary on mid-month revisions

When a salary structure changes mid-month (raise, role change), payroll
now pays the weighted average rather than just the latest structure.

  Old:  pay = (latest structure) × full month
  New:  pay = Σ over segments of (basic + hra + special) × days / cal_days

Tests: 4 new Vitest cases. Total = 42.

fix(lint): escape quotes in holiday-work-request-card empty state

Pre-existing react/no-unescaped-entities errors blocking CI. Mechanical
fix only.

refactor(schema): move lib/db/schema/hr.ts into hr/_all.ts + domain re-exports

Schema definitions stay in one canonical file (hr/_all.ts) ... rest of
explanation ...`
  ),
  S.body(
    "Scopes we use: payroll, hr, crm, projects, support, auth, schema, db, lint, deps, docs, ci. " +
      "Add new scopes when they help readability."
  ),
  S.body(
    "Per team policy we do NOT add a Co-Authored-By trailer. Commit + push happen per ticket; " +
      "every push triggers CI."
  ),

  S.h2("4.3 Pull request flow"),
  S.bullet("Push your branch. Open a PR against main using `gh pr create`."),
  S.bullet("PR description: what changed and why. Test plan as a checklist. Link the Linear/issue id."),
  S.bullet("Self-review the diff in the GitHub UI before requesting another reviewer; you will catch most lint and obvious mistakes there."),
  S.bullet("Tag one reviewer for code, one for the domain (HR PRs need an HR-domain reviewer)."),
  S.bullet("CI gates: typecheck, lint, test, build. All four must be green to merge."),
  S.bullet("Squash-merge unless the branch has a coherent commit history worth preserving."),

  S.h2("4.4 Local commands you’ll run constantly"),
  S.buildTable(
    [3000, 6360],
    ["Command", "Purpose"],
    [
      ["pnpm dev", "Start the dev server."],
      ["pnpm typecheck", "Run tsc --noEmit. Run before pushing."],
      ["pnpm lint", "Run ESLint. The CI runs the same."],
      ["pnpm test", "Run Vitest once."],
      ["pnpm test:watch", "Run Vitest in watch mode while writing tests."],
      ["pnpm test:coverage", "Run tests + coverage report."],
      ["pnpm build", "Production build. Catches Next.js-only errors that dev hides."],
      ["pnpm db:generate", "Generate a Drizzle migration after editing schema."],
      ["pnpm db:migrate", "Apply pending migrations to your DB."],
      ["pnpm db:studio", "Open Drizzle Studio in the browser to inspect data."],
    ]
  ),

  S.h2("4.5 Code review heuristics"),
  S.bullet("Multi-tenant isolation: every db.query / db.insert / db.update must be scoped by orgId. Most security regressions in this codebase are missing orgId filters."),
  S.bullet("Layer discipline: client components don’t import from server/. Server components don’t import 'use client' files unless they truly need to."),
  S.bullet("Validation: every route handler parses its body via parseBody(req, zodSchema). No exceptions."),
  S.bullet("Mutations: every mutation route invalidates the relevant query keys on success, or the UI lies for ~30 seconds."),
  S.bullet("Schema changes: additive. Drop columns in a follow-up PR after confirming the code referencing them is gone in prod."),
  S.bullet("`as any` is a CI error. If you genuinely need it (third-party type bug), add an inline disable with a one-line justification."),
];

const codebase = [
  S.pageBreak(),
  S.h1("5. Reading the Codebase"),

  S.h2("5.1 Where to start"),
  S.body(
    "If you have time only for one tour: open Doc 1 (System Architecture) side by side with the " +
      "repository, then walk these files in order. Each one is a checkpoint that anchors the " +
      "rest of the codebase."
  ),
  S.bullet("middleware.ts — the first server-side touchpoint of every request."),
  S.bullet("lib/auth/index.ts — NextAuth config, session shape, MFA hook."),
  S.bullet("lib/auth/helpers.ts — the canonical session resolver (used everywhere)."),
  S.bullet("lib/api/helpers.ts — withAuth, ok, err, parseBody."),
  S.bullet("lib/db.ts — the Drizzle client."),
  S.bullet("lib/db/schema/auth.ts — users, sessions, organizations, organizationMembers."),
  S.bullet("server/queries/hr/payroll.ts — a clean, recent query module to study."),
  S.bullet("app/api/hr/payrolls/generate/route.ts — a representative end-to-end mutation handler."),
  S.bullet("app/(dashboard)/hr/payroll/page.tsx — a representative server-rendered page with embedded client islands."),
  S.bullet("lib/api/hooks/crm/deals.ts — a representative TanStack Query hook bundle."),

  S.h2("5.2 Search-first navigation"),
  S.body(
    "The repository is large enough that opening folders in order will not work. Instead:"
  ),
  S.bullet("Need a route? `find app/api -name 'route.ts' | grep <area>`."),
  S.bullet("Need a query? `grep -rln 'export async function getX' server/queries/`."),
  S.bullet("Need a hook? `grep -rln 'export function useX' lib/api/hooks/`."),
  S.bullet("Need a table? `grep -n 'export const ' lib/db/schema/`."),
  S.bullet("Need an enum? It’s in lib/db/schema/enums.ts."),

  S.h2("5.3 Smell tests"),
  S.body(
    "When reviewing other people’s code, a small set of code smells flag 80% of the issues we " +
      "have shipped:"
  ),
  S.bullet("A db query without orgId in the WHERE clause."),
  S.bullet("A loop with `await db.…` inside it (N+1)."),
  S.bullet("A route handler that doesn’t use withAuth."),
  S.bullet("A mutation that doesn’t invalidate query keys on success."),
  S.bullet("`as any` without an inline disable + justification."),
  S.bullet("New code that hand-rolls a join shape that already exists in server/repos/."),
  S.bullet("`useState` for data that should be a server component prop."),
  S.bullet("`use client` on a component that doesn’t need it."),
];

const firstTask = [
  S.pageBreak(),
  S.h1("6. Your First Task"),
  S.body(
    "We pick a small, real ticket for week one. The goal is exposure to the full loop: branch, " +
      "implement, test, open PR, address review, merge. Typical first tickets:"
  ),
  S.bullet("A typo or copy fix on a customer-visible label (smallest possible diff)."),
  S.bullet("A missing index on a slow query (one schema change, one migration, one EXPLAIN before/after)."),
  S.bullet("A bug fix from the open issue tracker — pick something with clear repro steps."),
  S.bullet("A unit test for an existing pure function (the payroll calculator is a great target)."),
  S.body(
    "Do not pick a refactor for your first task. Refactors require pattern recognition that comes " +
      "from at least two weeks in the code. Mentor will guide you toward the right ticket."
  ),
];

const debugging = [
  S.pageBreak(),
  S.h1("7. Debugging"),

  S.h2("7.1 The dev server"),
  S.body(
    "Next.js prints route compilation errors and uncaught exceptions to the terminal. Almost all " +
      "real bugs surface there first. Keep the terminal visible while you work."
  ),

  S.h2("7.2 Browser devtools"),
  S.bullet("Network tab — every TanStack Query request shows up; check status, response, and timing."),
  S.bullet("React Devtools — the Components panel reveals the RSC vs client boundary; ‘Server’ pills mark RSCs."),
  S.bullet("React Query Devtools — exposed in dev only. Inspect cache contents and trigger invalidations manually."),

  S.h2("7.3 Server logs"),
  S.bullet("`pnpm dev` prints structured logs from lib/logger.ts."),
  S.bullet("In production, Vercel’s log drain forwards them to whichever observability backend is configured."),
  S.bullet("Sentry catches uncaught exceptions in any environment with a DSN."),

  S.h2("7.4 Database inspection"),
  ...S.code(
    `# Drizzle Studio — visual schema + query
pnpm db:studio

# Direct psql
psql $DATABASE_URL

# A common diagnostic: see the most recent payrolls for a user
SELECT id, month, status, gross_salary, net_salary, created_at
FROM payrolls
WHERE user_id = '...'
ORDER BY created_at DESC
LIMIT 5;`
  ),

  S.h2("7.5 When you are truly stuck"),
  S.bullet("Read the relevant document in this set first."),
  S.bullet("Search the repo for the function name and trace its callers."),
  S.bullet("Search closed PRs (`gh pr list --state closed --search '<keyword>'`)."),
  S.bullet("Ask in #engineering with: what you expected, what you observed, what you tried, the smallest reproducer."),
  S.bullet("Time-box: 90 minutes alone, then ask. The team would rather unblock you than have you sink a day."),
];

const watchOuts = [
  S.pageBreak(),
  S.h1("8. Things That Bite New Engineers"),
  S.bullet("Date timezones. Monthly payroll boundaries are local-time integers (day-of-month), not UTC Date objects. See lib/hr/payroll-calculations.ts for the pattern. Don’t mix the two."),
  S.bullet("Drizzle relations are declared in the same file as the table they belong to. Cross-file relations require importing the related table by name. Forgetting this manifests as 'undefined relation' errors at runtime, not compile time."),
  S.bullet("Server actions cannot return non-serializable values. If you wrap a Date or Drizzle row in an object, it goes through React’s serialization layer; convert dates to ISO strings."),
  S.bullet("Middleware does not run on API routes that explicitly opt out (none today, but watch the matcher). When a route returns 200 in dev but 401 in prod, suspect missing middleware."),
  S.bullet("Sentry only captures errors when a DSN is configured. Don’t test Sentry locally without setting NEXT_PUBLIC_SENTRY_DSN."),
  S.bullet("`as any` and untyped returns flow through the entire chain silently. Type your function returns explicitly."),
  S.bullet("`pnpm install` after pulling main is not optional. The lockfile changes more often than people remember."),
  S.bullet("Adding a new env var? Add it to .env.example AND ask the team to add it to Vercel project settings before merging."),
];

const learning = [
  S.pageBreak(),
  S.h1("9. Recommended Background Reading"),
  S.body(
    "Not required, but if you have evenings to spare these resources accelerate your ramp-up:"
  ),
  S.bullet("Next.js App Router docs (the page on Server Components, the page on Server Actions)."),
  S.bullet("Drizzle ORM relational queries guide — particularly the with: { … } and where: builders."),
  S.bullet("TanStack Query v5 — the page on optimistic updates and invalidations."),
  S.bullet("Auth.js (NextAuth v5) callbacks documentation."),
  S.bullet("Inngest — concept docs on events, functions, and step orchestration."),
  S.bullet("Postgres EXPLAIN ANALYZE primer (e.g. Bruce Momjian’s slides). Do not optimize what you don’t understand."),
  S.bullet("React Server Components mental model (Dan Abramov’s talk on the data lifecycle)."),
];

const checklist = [
  S.pageBreak(),
  S.h1("10. First-Week Checklist"),
  S.body("Cross these off in order. Mentor will pair on any item you get stuck on."),
  S.num("Day 1 — accounts created, repo cloned, .env.local filled, `pnpm dev` runs, sign-in works."),
  S.num("Day 2 — read Doc 1 (Architecture). Browse the codebase using Section 5.2 search recipes."),
  S.num("Day 2 — read Doc 5 (HR & Payroll) if you are joining the HR team, otherwise the doc matching your area."),
  S.num("Day 3 — fix a typo or unused import somewhere in the codebase. Open a PR. Get it merged."),
  S.num("Day 3 — write one Vitest unit test for an existing pure function. Get it merged."),
  S.num("Day 4 — pair with a teammate on a real ticket. Watch their PR flow."),
  S.num("Day 5 — pick up your own ticket. Open a PR by EOD."),
  S.num("Day 5 — attend the weekly engineering sync. Listen, take notes."),
];

const appendices = [
  S.pageBreak(),
  S.h1("Appendix A — Cheat Sheet"),
  ...S.code(
    `# Setup
pnpm install
cp .env.example .env.local
$EDITOR .env.local
pnpm db:migrate

# Develop
pnpm dev                # http://localhost:3000
pnpm test:watch
pnpm db:studio          # https://local.drizzle.studio

# Before pushing
pnpm typecheck
pnpm lint
pnpm test
pnpm build

# Commit + push (per-ticket)
git checkout -b feat/your-thing
# … work …
git add -A
git commit -m "feat(scope): summary"
git push origin HEAD

# Open PR
gh pr create --base main --title "feat(scope): summary"`
  ),
  S.pageBreak(),
  S.h1("Appendix B — Common errors and fixes"),
  S.buildTable(
    [4000, 5360],
    ["Error", "Fix"],
    [
      ["TypeError: Cannot read properties of undefined (reading 'orgId')", "Session not loaded. Check withAuth wraps the body and the handler isn’t exported as edge."],
      ["Drizzle: 'undefined relation'", "Cross-file relation imported but Drizzle didn’t see the table on registration. Confirm both files are imported transitively from lib/db/schema/index.ts."],
      ["No session — 401 in dev", "NEXTAUTH_SECRET missing or different from when the session was created. Sign out + sign in."],
      ["Hydration mismatch warning", "A client component is rendering a Date.now() or random value during the first render. Move to useEffect or pass a server-rendered value."],
      ["pnpm install fails on sharp", "Often M-series binary mismatch. `pnpm rebuild sharp` and retry."],
      ["Build error after pulling main", "Forgot pnpm install. Run it. If still failing, `pnpm install --force`."],
      ["Vercel preview build green, prod red", "Almost always env-var-related. Check the Vercel project for missing prod values."],
    ]
  ),
];

const doc = new Document({
  creator: "Vaivamm Capital — Engineering",
  title: DOC_TITLE,
  description: "Onboarding guide for new engineering hires.",
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
        ...welcome,
        ...prereq,
        ...setup,
        ...dailyDev,
        ...codebase,
        ...firstTask,
        ...debugging,
        ...watchOuts,
        ...learning,
        ...checklist,
        ...appendices,
      ],
    },
  ],
});

const outDir = path.join(__dirname, "..", "..", "docs", "word-docs");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "02-developer-onboarding.docx");
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log(`Wrote ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
});
