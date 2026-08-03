# User, Org and RBAC — explained in plain words

> Verified against the live database on 2026-07-29.
> Companion to [`rbac-org-map.md`](./rbac-org-map.md), which has the diagrams.

---

## The one sentence version

**A `user` is a person. An `organization` is a company. An `organization_member` is *this person, inside
that company* — and every question about "what are they allowed to do?" is answered from the membership,
never from the person.**

That single choice is what makes it safe for one person to belong to five companies at once.

---

## 1. `users` — who someone is

**Stores:** email, name, photo, phone, login credentials, whether they are a StreamlineOS platform admin.

**Why it exists:** a person needs one identity, not one per company. You sign in once. If you join a
second company tomorrow, you do not get a second account.

**Deliberately global — no `org_id`.** Same for `accounts`, `sessions`, `magic_link_tokens`,
`mfa_backup_codes`, `devices`, `user_preferences`. These describe *the human*, not their role anywhere.

> **Gotcha:** `users.role` is a leftover column. It is written once when a brand-new person accepts an
> invite, and nothing reads it for permissions any more. The real per-company role lives on
> `organization_members.role`. Do not build anything on `users.role`.

---

## 2. `organizations` — the company

**Stores:** name, slug, logo, timezone, currency, fiscal year, billing email, status, and
`owner_membership_id` (who owns it).

**Why it exists:** it is the **tenant boundary**. Every business row in the system carries an `org_id`,
and every query filters on it. It is the wall that stops Company A ever seeing Company B's data.

**Why not just "workspaces"?** Because billing, ownership, compliance and data residency attach to a
*company*, not a folder. Slack learned this the hard way and had to retrofit Enterprise Grid on top of
workspaces. Starting with the company as the boundary avoids that migration.

---

## 3. `organization_members` — the hub

**Stores:** `user_id`, `org_id`, `role`, `is_owner`, `status` (`INVITED` → `ACTIVE` → `SUSPENDED` →
`LEFT`), and the timestamps for each of those transitions.

**Why it exists — and why it is the most important table in the system:** every permission, every role,
every module ownership points at a **membership id**, not a user id.

Concretely: you are an Admin at Company A and a plain Member at Company B. Because your permissions hang
off two different membership rows, there is no code path that can leak your Company A powers into
Company B. If permissions hung off `user_id`, that leak would be one forgotten `WHERE` clause away.

**Two rules the database itself enforces:**

| Rule | How |
|---|---|
| A company has **at most one** owner | partial unique index on `(org_id) WHERE is_owner = true` |
| A company **always points at** its owner | `organizations.owner_membership_id` is `NOT NULL` |

Owners cannot be removed, suspended, demoted or allowed to leave until ownership is transferred. That is
not politeness — an ownerless org cannot transfer ownership, manage billing, or be recovered without a
platform admin.

---

## 4. `invitations` — joining a company

**Stores:** email, `org_id`, the role to grant on acceptance, who invited them, expiry, status, and a
**`token_hash`**.

**Why a separate table** (rather than an array on the organization): this is the classic mistake. If
invites live in an array inside the org row, updating one invite means: fetch the whole org → scan the
array → change one element → write the whole org back. That is slow, it cannot be indexed, two people
accepting at once overwrite each other, and you can never ask "show me all pending invites expiring this
week". As its own table, an invite is one indexed row you update directly.

**Why `token_hash` and not the token:** only the SHA-256 hash is stored. The real token exists solely in
the invitee's email. If the database leaked, nobody could accept anyone else's invitation.

---

## 5. The RBAC tables — who can do what

Permissions are **never** stored on the user. They are assembled per request from several sources.

### `permissions` — the dictionary
Every action the system understands, as `module:resource:action` — e.g. `hr:leaves:approve`. Three
lowercase parts. This is the vocabulary; nothing else may invent a key.

### `roles` — a named bundle of permissions
A role is just "a name for a set of permissions". Two kinds, told apart by `module_key`:

- `module_key IS NULL` → an **org-wide** role (`OWNER`, `ORG_ADMIN`, `MEMBER`)
- `module_key = 'hr'` → a **module role group** (your "Senior HR", "Recruitment HR")

Also carries `rank` (seniority), `is_system` (seeded, undeletable), and `version` (see below).

### `role_permission_grants` — which permissions a role carries
One row per permission per role, plus a **scope**: `all` (everyone's records), `team`, `own` (only their
own), or `none`. So a role answers both *"which action?"* and *"whose rows?"*.

### `role_assignments` — giving someone a role
Links a **membership** to a role. Can carry an `expires_at`, so temporary access expires by itself.

### `principal_groups` + `group_role_assignments` — roles for a group
Put ten people in "Mumbai Sales", give the group a role, and all ten get it. Add an eleventh person and
they inherit it. Without this you would re-assign roles person by person forever.

### `user_permissions` / `user_delegations` — the exceptions
A one-off grant to a single person, and a time-boxed hand-off ("cover for me while I'm on leave",
auto-expiring).

### `access_versions` — the cache trick
One integer per company. The permission cache key is
`access:perms:{org}:{user}:v{version}`. Change anyone's permissions and the version increments **inside
the same transaction** — which instantly orphans every cached entry for that company. No hunting down
individual cache keys to delete.

---

## 6. Modules — turning features on, and who runs them

| Table | Plain meaning |
|---|---|
| `modules_catalog` | the list of all modules, and which are free / paid / always-on |
| `org_modules` | which modules **this company** switched on |
| `user_module_access` | a per-person **block** ("Ravi may not open Payroll") |
| `module_ownerships` | exactly **one owner per module**, per company |
| `ownership_transfers` | the hand-over request and its accept/decline |

`kb` and `chat` are **core** — on for everyone, always, and deliberately not access-managed.

---

## 7. The six roles

| Role | What it means |
|---|---|
| **Platform Owner** | StreamlineOS staff. Only `/owner` routes. Not part of any customer company. |
| **Org Owner** | Owns the company. Exactly one. Can do everything. Transferable. |
| **Org Admin** | Can do everything **except** touch the Org Owner. Many allowed. |
| **Module Owner** | Runs one module. Exactly one per module. Transferable. |
| **Module Admin** | Runs the module too, but cannot remove the Module Owner or transfer ownership. |
| **Module Member** | Gets only what their assigned role groups grant. |

**CEO, HR, Sales, Engineering are *not* roles.** They are examples of **role groups a module admin
creates**. "Recruitment HR" is a group inside the HR module that can screen candidates but cannot
approve leave. That is the whole point: you define your own job titles, we do not guess them for you.

**Seniority (`rank`)** — lower is more senior: Org Owner `0`, Org Admin `10`, Module Owner `15`,
Module Admin `20`, custom groups `30`. You can never create or edit a role at or above your own rank,
and you can never grant a permission you do not hold yourself.

---

## 8. How a request is actually decided

```
Are you a platform admin or the org owner?        → yes: allow everything
Is the module switched on for this company?       → no:  deny
Is your membership ACTIVE?                        → no:  deny
Collect everything you hold:
     your roles + your groups' roles
   + direct grants + active delegations
   + every permission of any module you OWN
Remove any module you are personally blocked from
Is the required permission in what's left?        → no:  deny
                                                  → yes: allow
```

**Deny by default.** Someone with no role, no group and no grant can reach nothing at all.

---

## 9. Two safety rules worth knowing

**Concurrent edits.** Role groups carry a `version`. Saving sends the version you loaded; if someone
else saved first the numbers disagree and you get a "reload and try again" instead of silently wiping
their change.

**Nothing important is a bare list.** Invites, members, role assignments, group memberships, audit
entries — each is its own table with its own id and index. Anything stored as an array inside another
row cannot be indexed, cannot be paginated, cannot be updated by two people safely, and cannot be
queried on its own. That is the single rule this schema is most careful about.

---

## 10. "Why are there 775 tables?"

Because it is nine products in one — HR, CRM, Build, Inventory, Accounting, Payroll, Support, Surveys,
e-Sign — plus billing, AI, notifications and audit.

Measured on 2026-07-29: **765 tables are declared in code and 756 are referenced by application code.**
Only **8** were genuinely dead, and those have been dropped.

An empty table is not a dead table — a fresh install has 700+ empty tables and every one of them is live
the moment someone uses that feature. The real test is whether code touches it, not whether it has rows
yet.


---

## 11. The tables in detail, grouped by question they answer

### "Who is this person?" — identity (global, no `org_id` on purpose)

| Table | Stores | Why separate |
|---|---|---|
| `users` | email, name, photo, phone, `is_platform_admin`, `last_active_org_id` | one identity across every company |
| `accounts` | OAuth provider links (Google, GitHub…) | one person can sign in several ways |
| `sessions`, `user_sessions` | live logins, device, IP, revocation | you must be able to kill one device without killing all |
| `magic_link_tokens`, `email_otp_codes` | passwordless login material, hashed + expiring | short-lived secrets do not belong on the user row |
| `mfa_backup_codes`, `devices` | 2FA recovery, trusted devices | each is a list — a list needs its own table |
| `user_preferences` | theme, language, timezone, date format | preferences are the person's, not the company's |

### "Which company, and are they still in it?" — tenancy

| Table | Stores | Why it matters |
|---|---|---|
| `organizations` | company profile, branding, fiscal year, status, `owner_membership_id` | the tenant wall |
| `organization_members` | `user_id` + `org_id` + `role` + `is_owner` + `status` + lifecycle timestamps | **the hub** — everything about access points here |
| `invitations` | email, role to grant, inviter, expiry, status, `token_hash` | joining is a process with states, not a flag |
| `invitation_events` | what happened to an invite and when | you need to answer "who re-sent this, and when?" |
| `org_units` | departments / teams / branches, self-referencing via `parent_id` | an org chart is a tree, not a column |
| `org_unit_members` | who is in which unit | many-to-many needs a join table |

### "What are they allowed to do?" — authorization

| Table | Stores | Plain meaning |
|---|---|---|
| `permissions` | `hr:leaves:approve`, `crm:leads:view`, … | the dictionary of every possible action |
| `permission_supported_scopes` | which scopes a permission may take | not every action makes sense as "own only" |
| `roles` | name, slug, `module_key`, `rank`, `is_system`, `version` | a named bundle of permissions |
| `role_permission_grants` | role → permission + **scope** | *which* action, and *whose* rows |
| `role_assignments` | membership → role, with optional `expires_at` | giving a person a role, optionally temporarily |
| `principal_groups` | a named set of people | "Mumbai Sales" |
| `principal_group_members` | who is in the group | |
| `group_role_assignments` | group → role | give ten people a role at once |
| `user_permissions` | a one-off grant to one person | the exception to the rule |
| `user_delegations` | time-boxed hand-off, `starts_at` → `ends_at` | "cover for me while I'm away" |
| `access_versions` | one counter per company | the cache-busting trick (see §5) |
| `audit_logs` | actor, target, before/after, IP, timestamp | who changed what |

### "Which features are on, and who runs them?" — modules

| Table | Plain meaning |
|---|---|
| `modules_catalog` | the master list — free / paid / always-on |
| `org_modules` | which modules this company enabled, when, by whom |
| `user_module_access` | a per-person block ("Ravi may not open Payroll") |
| `module_ownerships` | exactly one owner per module per company |
| `ownership_transfers` | the hand-over offer and its accept / decline / expiry |

---

## 12. The endpoints

**Org & members** — `/organization`
`switch` · `members` (list / add / update / remove) · `members/:memberId/suspend` · `.../reactivate` ·
`invitations` (create / list) · `invitations/validate` · `invitations/accept` · `settings` · `security` ·
`custom-domains` · `holidays` · `archive` · `restore` · `leave` · `:orgId/purge/schedule`

**Org extras** — `/org`
`all` · announcements (`:announcementId`, `/read`) · `members` · `setup/session` · `setup/complete` ·
`setup/skip`

**Access** — `/access`
`:moduleKey` · `:userId` (per-user module enable / disable)

**RBAC** — `/rbac`
`permissions` · `permissions/matrix` · `role-permissions` · `user-permissions` · `access-snapshot` ·
`discovery/permissions` · `discovery/grantable` · `discovery/templates` · `discovery/members` ·
`analytics` · `simulate/:targetUserId` · `seed-defaults` · `templates` · `:roleId` (+ `/permissions`,
`/members`)

**Module access** — `/module-access/:moduleKey`
`catalog` · `roles` · `roles/:roleId/permissions` · `groups` (+ `/:groupId`, `/permissions`, `/members`) ·
`me/permissions` · `members` (flat list / add / update / remove) · `member-candidates` · `audit-log` ·
`ownership` · `ownership/transfer`

**Ownership** — `/ownership`
`modules` · `modules/:moduleKey` · `modules/:moduleKey/owner` · `org/transfer` · `org/owner` ·
`modules/:moduleKey/transfer` · `transfers` · `transfers/incoming` · `transfers/:id/accept` ·
`transfers/:id/decline` · `transfers/:id` (cancel)

Every one is guarded server-side. `simulate/:targetUserId` is worth knowing about — it answers
"what would this person see?" without logging in as them.
