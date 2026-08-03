# StreamlineOS — Identity, Org, RBAC & Module Access

> Verified against the live schema on 2026-07-29 (83 migrations, 775 tables).
> Every table and column named here was read from `information_schema`, not from memory.

---

## 1. The whole thing in one picture

```mermaid
flowchart TD
    U["users<br/><i>global identity — one row per human</i>"]
    O["organizations<br/><i>the tenant</i>"]
    M["organization_members<br/><b>the join — everything hangs off this</b>"]

    U -->|"belongs to many"| M
    M -->|"of exactly one"| O

    M --> RA["role_assignments"] --> R["roles"]
    M --> PGM["principal_group_members"] --> PG["principal_groups"] --> GRA["group_role_assignments"] --> R
    M --> MO["module_ownerships<br/><i>1 owner per module</i>"]
    M --> UP["user_permissions<br/><i>direct grants</i>"]
    M --> UD["user_delegations<br/><i>time-boxed</i>"]

    R --> RPG["role_permission_grants<br/><i>permission_key + scope</i>"]

    O --> OM["org_modules<br/><i>which modules are on</i>"]
    O --> UMA["user_module_access<br/><i>per-user deny</i>"]
    O --> AV["access_versions<br/><i>cache-busting counter</i>"]

    style M fill:#1e3a5f,color:#fff
    style U fill:#2d4a22,color:#fff
    style O fill:#5c3a1e,color:#fff
```

**The one thing to internalise:** `organization_members` is the hub. A person is `users`. A tenant is
`organizations`. *Everything about what someone can do* keys off their **membership row**, never off
their global user id. That is what makes multi-org membership safe.

---

## 2. Entity map

```mermaid
erDiagram
    users ||--o{ organization_members : "is a member via"
    organizations ||--o{ organization_members : "has"
    organizations ||--|| organization_members : "owner_membership_id"

    organization_members ||--o{ role_assignments : "granted"
    roles ||--o{ role_assignments : ""
    roles ||--o{ role_permission_grants : "carries"

    organization_members ||--o{ principal_group_members : ""
    principal_groups ||--o{ principal_group_members : ""
    principal_groups ||--o{ group_role_assignments : ""
    roles ||--o{ group_role_assignments : ""

    organization_members ||--o{ module_ownerships : "owns"
    organization_members ||--o{ ownership_transfers : "from / to"
    organization_members ||--o{ user_permissions : "direct grant"
    organization_members ||--o{ user_delegations : "delegates"

    organizations ||--o{ org_modules : "enables"
    organizations ||--o{ user_module_access : "denies per user"
    organizations ||--|| access_versions : "cache version"
    organizations ||--o{ invitations : "pending joins"
    organizations ||--o{ org_units : "departments / teams"
    organizations ||--o{ audit_logs : ""

    modules_catalog ||--o{ org_modules : "defines"
```

---

## 3. Journey — a brand-new user creates an organization

```mermaid
sequenceDiagram
    actor P as Person
    participant FE as Next.js
    participant API as NestJS
    participant DB as Postgres

    P->>FE: sign up (passwordless — magic link / OAuth)
    FE->>API: auth bridge
    API->>DB: INSERT users (id, email, is_active)
    Note over DB: no org yet — user exists but belongs nowhere

    P->>FE: /org-setup
    FE->>API: POST create organization
    API->>DB: BEGIN
    DB->>DB: INSERT organizations (status ACTIVE)
    DB->>DB: INSERT organization_members (is_owner = true, status ACTIVE)
    DB->>DB: UPDATE organizations SET owner_membership_id = <that row>
    DB->>DB: INSERT org_modules for core modules
    DB->>DB: bumpPermissionsVersion(org)
    API->>DB: COMMIT
    API-->>FE: org ready
```

Two invariants set here, both enforced by the database:

| Invariant | Enforced by |
|---|---|
| An org has **at most one** owner | `uniq_org_members_single_owner` — partial unique on `(org_id) WHERE is_owner = true` |
| An org **always points at** its owner | `organizations.owner_membership_id` is `NOT NULL` |

Owner rows can never be removed, suspended, demoted or left — all four paths refuse until ownership
is transferred.

---

## 4. Journey — someone is invited

```mermaid
sequenceDiagram
    actor A as Admin
    actor N as Invitee
    participant API as NestJS
    participant DB as Postgres

    A->>API: invite bob@acme.com as HR
    API->>API: assertWithinLimit(org, "members")
    API->>DB: INSERT invitations (token_hash = SHA256(raw), status PENDING, expires_at)
    Note over DB: only the HASH is stored — the raw token exists only in the email
    API-->>N: email with raw token

    N->>API: accept(rawToken)
    API->>DB: SELECT invitations WHERE token_hash = SHA256(rawToken)
    alt no match
        API-->>N: 404 (wrong / already used / expired)
    else match
        API->>DB: BEGIN
        DB->>DB: INSERT users (if new)
        DB->>DB: INSERT organization_members (status ACTIVE, role = invitation.role)
        DB->>DB: UPDATE invitations SET status ACCEPTED, accepted_membership_id
        DB->>DB: bumpPermissionsVersion(org)
        API->>DB: COMMIT
    end
```

**`invitations`** stores: `email`, `token_hash`, `org_id`, `role`, `invited_by`, `expires_at`,
`status` (`PENDING|ACCEPTED|DECLINED|EXPIRED|REVOKED`), `inviter_membership_id`,
`accepted_membership_id`, `declined_at`, `revoked_at`, `revoked_by_membership_id`.

A partial unique index blocks a second *pending* invite to the same email in the same org.

---

## 5. The three ways a permission reaches a person

```mermaid
flowchart LR
    M["organization_members"]

    M -->|"direct"| RA["role_assignments<br/><i>expires_at optional</i>"]
    RA --> R["roles"]

    M -->|"via a group"| PGM["principal_group_members"]
    PGM --> PG["principal_groups"]
    PG --> GRA["group_role_assignments"]
    GRA --> R

    R --> RPG["role_permission_grants<br/>permission_key + scope"]

    M -->|"one-off"| UP["user_permissions"]
    M -->|"time-boxed"| UD["user_delegations<br/>starts_at → ends_at"]
    M -->|"owns a module"| MO["module_ownerships"]

    RPG --> RES(("resolved<br/>permission map"))
    UP --> RES
    UD --> RES
    MO --> RES
```

All sources **union** together — allow wins, there are no deny rules. Where two sources grant the
same key with different scopes, the **broadest** scope wins.

**`data_scope`** is `all | team | own | none` — it answers *"whose rows?"* alongside *"which action?"*.

---

## 6. The hot path — resolving permissions on a request

This runs on essentially every authenticated request.

```mermaid
flowchart TD
    START([request]) --> AUTH{authenticated?}
    AUTH -->|no| D1[401]
    AUTH -->|yes| PA{platform admin<br/>or org owner?}
    PA -->|yes| ALLOW([ALLOW everything])
    PA -->|no| MOD{module enabled<br/>for this org?}
    MOD -->|no| D2[403]
    MOD -->|yes| CACHE{"cache hit?<br/>access:perms:{org}:{user}:v{version}"}
    CACHE -->|yes| CHECK
    CACHE -->|no| ACTIVE{membership<br/>status = ACTIVE?}
    ACTIVE -->|no| D3[deny — empty map]
    ACTIVE -->|yes| BUILD["union of:<br/>role_assignments (unexpired)<br/>+ group → group_role_assignments<br/>+ user_permissions<br/>+ user_delegations (in window)<br/>+ module_ownerships → all keys for that module"]
    BUILD --> STRIP["strip modules denied in<br/>user_module_access"]
    STRIP --> CACHE2[(write cache)]
    CACHE2 --> CHECK{required key present<br/>and scope ≠ none?}
    CHECK -->|no| D4[403]
    CHECK -->|yes| ALLOW

    style ALLOW fill:#1a4d2e,color:#fff
    style D1 fill:#5c1e1e,color:#fff
    style D2 fill:#5c1e1e,color:#fff
    style D3 fill:#5c1e1e,color:#fff
    style D4 fill:#5c1e1e,color:#fff
```

**Deny by default.** A member with no role, no group and no direct grant can reach nothing.

**Cache invalidation.** `access_versions.permissions_version` is bumped *inside the same transaction*
as any permission change. Because the version is part of the Redis key, a bump instantly orphans every
cached entry for that org — no explicit delete needed.

---

## 7. Module access — the shared model

**9 access-managed modules:** `hr` · `crm` · `build` · `accounting` · `inventory` · `support` ·
`surveys` · `payroll` · `sign`

**2 core modules, common to everyone:** `kb` · `chat` — `is_core = true` in `modules_catalog`, so they
are *not* access-managed and have no per-module RBAC page.

```mermaid
flowchart TD
    MC["modules_catalog<br/><i>the 11 modules — is_core, is_paid_only</i>"]
    OM["org_modules<br/><i>which this org turned on</i>"]
    UMA["user_module_access<br/><i>per-user override — a deny</i>"]
    MO["module_ownerships<br/><b>UNIQUE (org_id, module_key)</b>"]
    RG["roles WHERE module_key IS NOT NULL<br/><i>the 'role groups' — e.g. Recruitment HR</i>"]

    MC --> OM --> UMA
    OM --> MO
    OM --> RG --> GRANTS["role_permission_grants"]
```

### Who can do what within a module

| Tier | Reach | Cannot |
|---|---|---|
| Org owner / platform admin | everything, everywhere | — |
| Org admin | everything | mutate the **org owner** |
| **Module owner** (exactly 1 per module) | all keys in that module | nothing in other modules |
| **Module admin** | all keys in that module | mutate the **module owner**, transfer ownership |
| Module member | exactly the union of their role groups | everything else |
| No group | nothing | — |

Seniority is `ROLE_RANK`: Owner `0` → Org Admin `10` → Module Admin `20` → module custom `30` →
functional `40`. **Lower number = more senior.** You can never create or modify a role at or above
your own rank, and never grant a permission you do not hold.

### `roles` doubles as the role group

One table serves both org-wide roles and module role groups — `module_key` is what distinguishes them.

| Column | Meaning |
|---|---|
| `module_key` | `NULL` = org-wide role · set = module role group |
| `rank` | seniority ladder above |
| `is_system` | seeded — immutable and undeletable, but duplicable |
| `version` | optimistic-lock token — see §9 |
| `description`, `created_by` | provenance |

Unique on `(org_id, COALESCE(module_key,''), LOWER(name))` — so two "Recruitment HR" groups cannot
coexist in one module, **case-insensitively**.

---

## 8. Ownership transfer — a consent handshake

Ownership is never pushed onto someone. It is offered and must be accepted.

```mermaid
stateDiagram-v2
    [*] --> PENDING: owner initiates
    PENDING --> ACCEPTED: recipient accepts
    PENDING --> DECLINED: recipient declines
    PENDING --> CANCELLED: initiator cancels
    PENDING --> EXPIRED: expires_at passes
    ACCEPTED --> [*]
    DECLINED --> [*]
    CANCELLED --> [*]
    EXPIRED --> [*]
```

On **accept**, in one transaction: lock both membership rows `FOR UPDATE` → promote the recipient →
demote the previous owner → bump the permissions version → bust both users' caches.

`ownership_transfers` stores `scope` (`ORGANIZATION` | `MODULE`), `module_key`, `from_membership_id`,
`to_membership_id`, `status`, `initiated_at`, `responded_at`, `expires_at`, `reason`.

**Break-glass:** a platform-admin-only `PUT /ownership/org/owner` exists for the dead-owner case (the
owner left and can never accept anything). It is rate-limited to 10/hour and always audited.

---

## 9. Concurrency, caching and audit

| Concern | Mechanism |
|---|---|
| Two admins editing one role group | `roles.version` compare-and-swap — `UPDATE … WHERE version = ?`; 0 rows → **409**, never a silent overwrite |
| Stale permissions after a revoke | version is part of the Redis key; bump inside the write transaction. In-process caches are cleared on bump — **caveat: other replicas can lag up to 5s** |
| Cross-tenant leakage | every query and every cache key carries `org_id`; composite `(org_id, id)` FKs make a cross-tenant link unrepresentable |
| Who changed what | `audit_logs` — `action`, `actor_user_id`, `target_id`, `target_type`, `metadata` (incl. `moduleKey` and permission add/remove diff), `ip_address` |
| Abuse | ownership transfer 5/hr · force-set 10/hr · group mutations 30/min |

---

## 10. Table reference — what each one stores

### Identity (global — no `org_id`, by design)

| Table | Stores |
|---|---|
| `users` | the human: email, name, profile, `is_platform_admin`, `last_active_org_id` |
| `accounts`, `sessions`, `user_sessions` | OAuth links and live sessions |
| `magic_link_tokens`, `email_otp_codes`, `mfa_backup_codes`, `devices` | passwordless auth material |

### Tenancy

| Table | Stores |
|---|---|
| `organizations` | the tenant: name, slug, branding, `owner_membership_id`, status, purge schedule |
| `organization_members` | **the hub** — `user_id`, `org_id`, `role`, `is_owner`, `status` (`INVITED\|ACTIVE\|SUSPENDED\|LEFT`), lifecycle timestamps |
| `invitations` | pending joins, hashed tokens |
| `org_units` / `org_unit_members` | departments, teams, branches — self-referencing hierarchy via `parent_id` |

### Authorization

| Table | Stores |
|---|---|
| `roles` | roles **and** module role groups (`module_key`), with `rank`, `version`, `is_system` |
| `role_permission_grants` | which `permission_key` at which `scope` a role carries |
| `role_assignments` | membership → role, optionally expiring |
| `principal_groups` / `principal_group_members` / `group_role_assignments` | group-based assignment |
| `user_permissions` | direct one-off grants |
| `user_delegations` | time-boxed hand-off (`starts_at` → `ends_at`, revocable) |
| `permissions` | DB mirror of the static catalog: `name`, `resource`, `action`, `module_key`, `risk_class`, `is_delegable` |
| `access_versions` | the per-org cache-busting counter |

### Modules

| Table | Stores |
|---|---|
| `modules_catalog` | the 11 modules — `is_core`, `is_paid_only`, `status` |
| `org_modules` | which modules this org enabled, when, by whom |
| `user_module_access` | per-user **deny** override |
| `module_ownerships` | exactly one owner per `(org, module)` |
| `ownership_transfers` | the handshake |

---

## 11. Things that will trip you up

- **`modules` is not the module catalog.** `modules` is a *Build*-module concept (a module inside a
  project). The RBAC one is **`modules_catalog`**. Different worlds, unfortunate name collision.
- **`users.role` is legacy.** It is written once when a brand-new user accepts an invite. Nothing
  reads it for routing or authorization any more — per-org role lives on `organization_members.role`,
  and real authorization comes from `role_assignments`.
- **Permission format is `<module>:<resource>:<action>`** — three colon-separated lowercase segments,
  e.g. `hr:leaves:approve`. The `resource` segment is the "page" the UI groups by.
- **Owner and admin bypass everything.** When testing a permission gate, test as a plain member —
  an owner will pass regardless of whether the gate works.
- **A frontend-only permission key is invisible, not loud.** `useCan` returns `false` forever for a key
  the backend does not know. Both catalogs must agree; drift is currently **0** and should stay there.
- **The frontend never decides authorization.** Hiding a button is UX. Every mutating call is
  re-verified server-side. Next.js middleware is *not* an authorization boundary (CVE-2025-29927).
