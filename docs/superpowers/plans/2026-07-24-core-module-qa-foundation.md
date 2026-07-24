# Core Module QA Foundation Plan

> **For agentic workers:** Execute M0 from `testing/tickets/m0-foundation.md`, then sync backlog → StreamlineOS when MCP is configured. Steps use checkbox syntax.

**Goal:** Make the 231-ticket local QA backlog measurable and optionally mirrored as StreamlineOS project tickets.

**Architecture:** Local markdown backlog (`testing/QA_BACKLOG.md` + `testing/tickets/*`) is the source of truth. StreamlineOS MCP is an optional mirror for assignment and progress visibility. No product app code changes in this plan.

**Tech Stack:** Existing `pnpm -C backend seed:demo` / `seed:enterprise` / `backfill:rbac`; Cursor StreamlineOS MCP (`docs/mcp-agent-access.md`); browser audit per `testing/AUDIT_FRAMEWORK.md`.

---

### Task 1: Confirm environment (QA-M0-001 / 002)

**Files:** none (ops)

- [ ] **Step 1:** Start backend and frontend

```bash
pnpm -C backend start:dev
pnpm -C frontend dev
```

- [ ] **Step 2:** Probe health

```bash
curl -s http://localhost:1500/health
```

Expected: JSON with ok/healthy status (200).

- [ ] **Step 3:** Note migration debt from recent `PAGES.md` / ops notes; apply only with user approval if TTY required.

- [ ] **Step 4:** Mark `QA-M0-001` / `QA-M0-002` done in `testing/tickets/m0-foundation.md` and bump dashboard in `testing/QA_BACKLOG.md`.

---

### Task 2: Seed Org Alpha / Beta + roles (QA-M0-003…006)

**Files:** prefer existing seeds — do not invent new seed code unless M0 proves insufficient.

- [ ] **Step 1:** Run demo or enterprise seed

```bash
pnpm -C backend seed:demo
# and/or
pnpm -C backend seed:enterprise
```

- [ ] **Step 2:** Backfill RBAC

```bash
pnpm -C backend backfill:rbac
```

- [ ] **Step 3:** Create or document second org (Org Beta) for cross-tenant tests — manual UI create is OK if seed only creates one org; record org ids privately.

- [ ] **Step 4:** Ensure identities exist for platform-admin, owner, admin, PM, contributor, approver, client, denied. Store passwords/tokens outside git.

- [ ] **Step 5:** Mark `QA-M0-003`…`006` done; update dashboard %.

---

### Task 3: Access matrix + evidence conventions (QA-M0-007…009)

**Files:**

- Create (optional): `testing/tickets/rbac-matrix-m1-first-slice.md`
- Use: `testing/tickets/DEFECT_TEMPLATE.md`

- [ ] **Step 1:** For first-slice actions (create project, ticket mutate, approve, portal view, cross-tenant deny), write expected UI/API per role.

- [ ] **Step 2:** Agree evidence folder path locally (e.g. `testing/evidence/` gitignored) — do not commit secrets or PII screenshots to git without approval.

- [ ] **Step 3:** Mark `QA-M0-007`…`009` done.

---

### Task 4: Configure StreamlineOS MCP (QA-M0-012) — optional

**Files:** `.cursor/mcp.json` (local only; never commit token)

- [ ] **Step 1:** Generate agent token in app: Projects → Settings → Integrations → AI Agent Access.

- [ ] **Step 2:** Add MCP server per `docs/mcp-agent-access.md` with `STREAMLINEOS_TOKEN` + `STREAMLINEOS_API_URL`.

- [ ] **Step 3:** Restart Cursor; confirm tools `list_projects`, `list_my_tickets`, etc. appear.

- [ ] **Step 4:** Mark `QA-M0-012` done when `list_projects` succeeds.

---

### Task 5: Bulk-create tickets in StreamlineOS (QA-M0-010)

**Prerequisite:** Task 4 green. MCP was **not** available when the backlog was written.

- [ ] **Step 1:** `list_projects` — pick or create a project e.g. `QA Core Modules` with key `QA`.

- [ ] **Step 2:** Create tickets in batches of 20–40 from local rows, title format:

```text
[QA-M1-P-016] Page audit: /projects/[projectId]
```

Description body must include: type, priority, role, acceptance criteria, link to local backlog file.

- [ ] **Step 3:** Order batches: M0 → M1-J-025 + M1 P0 pages → M1 RBAC → M2 P0 → M3 P0 → remainder.

- [ ] **Step 4:** After each batch, annotate local row with StreamlineOS key (optional column or comment under the table).

- [ ] **Step 5:** Mark `QA-M0-010` done when sync process is documented and first batch created.

**If MCP stays unavailable:** keep markdown backlog; progress % still works. Do not fake MCP calls.

---

### Task 6: Start measurable execution

- [ ] **Step 1:** Execute `QA-M1-J-025` (first-slice) with multi-role evidence.

- [ ] **Step 2:** Open defects with `DEFECT_TEMPLATE.md`.

- [ ] **Step 3:** Update dashboard after every session so % complete is visible.

---

## Self-review vs spec

| Spec section | Covered by |
|--------------|------------|
| M0 foundation | `m0-foundation.md` + Tasks 1–3 |
| M1 Projects / approvals / portal | `m1-projects-pages.md` + `m1-projects-workflows.md` |
| M2 admin groups | `m2-workspace-admin.md` |
| M3 Chat/Inbox/Calendar | `m3-chat-inbox-calendar.md` |
| Ticket workflow / MCP safety | Task 4–5 + `QA_BACKLOG.md` |
| First execution slice | `QA-M1-J-025` |

No placeholders remaining. Product code out of scope for this plan.
