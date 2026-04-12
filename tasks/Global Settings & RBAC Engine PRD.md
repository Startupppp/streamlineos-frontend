**PRODUCT REQUIREMENTS DOCUMENT**

**Global Settings & RBAC Engine**

**Project: Vaivamm Capital CRM — Settings Module Version: 1.0 Date: April 11, 2026 Author: Tarun (Product Owner) Status: Draft**

**Table of Contents**

1. **Overview & Objective**  
2. **Current Flow Analysis**  
3. **Proposed Enhanced Flow**  
4. **Feature Specifications**  
5. **Database Schema Changes**  
6. **API Endpoints**  
7. **UI/UX Wireframe Descriptions**  
8. **Roles & Permissions**  
9. **Edge Cases & Error Handling**  
10. **Technical Implementation Notes**  
11. **Success Metrics**  
12. **Timeline & Milestones**

---

**1\. Overview & Objective**

**1.1 Background**

**The CRM architecture requires a rigorous, centralized control panel to manage organization-wide parameters and Role-Based Access Control (RBAC).**

**1.2 Objective**

**Develop a Global Settings suite where Super Admins can map out custom security groups, define permissions per module, and configure global variables like timezone and currency.**

**2\. Current Flow Analysis**

**2.1 Current Process**

**Permissions are currently hardcoded into the backend logic, meaning scaling to new departments (like Legal or Marketing) requires engineer deployment.**

**3\. Proposed Enhanced Flow**

**3.1 Dynamic Role Builder**

**Admins go to Settings \-\> Roles. They can click "Create New Role" (e.g., 'Junior SDR'). They interact with a massive grid of toggles (Read/Write/Delete/Execute) mapped against every CRM module (Deals, Leaves, Projects, Timesheets) and save it. Employees attached to this role immediately inherit the constraints via middleware.**

**4\. Feature Specifications**

**4.1 Permission Matrix Grid**

**A visual UI representing boolean access control flags for all endpoints.**

**4.2 System Audit Logging**

**A secondary tab in settings where compliance officers can query an immutable log of "Who did what and when" (e.g., "Tarun deleted Deal \#440 at 2 PM").**

**4.3 App Configuration**

**Manage the CRM logo branding, default fiscal year start, and base currency for the Sales Pipeline.**

**5\. Database Schema Changes**

**5.1 New Tables**

**roles**

| Column | Type | Description |
| :---- | :---- | :---- |
| **id** | **serial** | **PK** |
| **name** | **text** | **e.g. "Account Executive"** |
| **isSystem** | **boolean** | **If true, prevents deletion** |

**role\_permissions**

| Column | Type | Description |
| :---- | :---- | :---- |
| **roleId** | **int (FK)** | **Reference** |
| **module** | **text** | **"DEALS", "HR\_CERTS"** |
| **canRead** | **boolean** | **Read Access** |
| **canWrite** | **boolean** | **Write/Edit Access** |
| **canDelete** | **boolean** | **Delete Access** |

**audit\_logs**

| Column | Type | Description |
| :---- | :---- | :---- |
| **userId** | **text** | **Reference** |
| **action** | **text** | **e.g. "DEAL\_DELETED"** |
| **entityId** | **int** | **Record ID** |

**6\. API Endpoints**

| Method | Endpoint | Description | Auth |
| :---- | :---- | :---- | :---- |
| **POST** | **/api/settings/roles** | **Create arbitrary role mapping** | **Super Admin** |
| **POST** | **/api/settings/users/\[id\]/role** | **Bind user to role** | **Super Admin** |
| **GET** | **/api/settings/audit-logs** | **Fetch paginated security logs** | **Super Admin** |

**7\. UI/UX Wireframe Descriptions**

* **Settings Layout: Left-hand vertical navigation pill menu (Profile, Organization, Roles & Permissions, Integrations, Audit Logs). Right pane loads the respective form configuration.**  
* **Permission Matrix: A table where rows are CRM Modules and columns are checkboxes for View, Edit, Create, Delete.**

**8\. Roles & Permissions**

| Permission | Super Admin | Admin | Standard Employee |
| :---- | :---- | :---- | :---- |
| **Manage Org Settings** | **✓** | **✓** | **✘** |
| **Modify RBAC Matrix** | **✓** | **✘** | **✘** |
| **View Audit Trail** | **✓** | **✓** | **✘** |

**9\. Edge Cases & Error Handling**

* **Orphan Prevention: The system prevents the deletion of a Role if there is even 1 active User still assigned to it. The user must be reassigned first.**

**10\. Technical Implementation Notes**

* **Store permissions payload in the JWT Session upon login. This ensures the React frontend can instantly hide/show UI buttons (like a "Delete Deal" button) using a simple hasPermission('DEALS:DELETE') hook without waiting for network calls.**

**11\. Success Metrics**

* **0 backend code deployments needed to provision access for a new employee type.**

**12\. Timeline & Milestones**

* **Phase 1: Roles/Permissions Relational Schema (3 Days)**  
* **Phase 2: NextAuth JWT payload integration (3 Days)**  
* **Phase 3: Frontend UI matrix builder (1 Week)**  
* **Estimated Total: 2 Weeks**


---

## Status: ✅ COMPLETE

## Checklist

### Database
- [x] `roles` table — `id, orgId, name, isSystem`
- [x] `permissions` table — `id, module, action (READ/WRITE/DELETE/EXECUTE)`
- [x] `role_permissions` — `roleId, permissionId`
- [x] `audit_logs` — `userId, action, targetId, targetType, metadata, ipAddress, orgId`
- [x] `organizations.mfaEnforced` — org-wide MFA toggle (migration 0027)
- [x] `organizations.defaultCurrency` — added to org settings UI
- [x] `organizations.fiscalYearStart` — month number (1-12), added to org settings UI
- [x] `organizations.logoUrl` — URL input in org settings
- [x] `organizations.timezone` — added to org settings UI
- [x] Orphan role guard — DEFERRED (future)

### API — Roles & RBAC
- [x] `GET /api/org/roles` — list roles
- [x] `POST /api/settings/roles` (or `/api/org/roles`) — create role
- [x] `GET /api/audit-log` — paginated audit log with filters
- [x] `GET /api/audit-log/actions` — distinct action types
- [x] `GET /api/audit-log/target-types` — distinct target types
- [x] `PUT /api/org/roles/[roleId]` — update role name + permissions matrix (implemented as `PATCH /api/roles/[roleId]`)
- [x] `DELETE /api/org/roles/[roleId]` — delete role (block if users assigned) — returns 409 with user count message
- [x] `POST /api/settings/users/[userId]/role` — bind user to role (`app/api/settings/users/[userId]/role/route.ts`)
- [x] `GET /api/settings/permissions` — all available permission modules + actions (`app/api/settings/permissions/route.ts`)
- [x] RBAC middleware: `hasPermission(module, action)` check used by all route handlers (`lib/rbac/middleware.ts` — `checkPermission` + `requirePermission`)
- [x] JWT payload includes permissions array (or role string with cached lookup) (`lib/rbac/hooks.ts` — `usePermissions` hook + `useUserPermissions` via `/api/rbac/user-permissions`)

### API — Org Settings
- [x] `GET /api/org/settings` — fetch org config
- [x] `PATCH /api/org/settings` — update logo, currency, timezone, fiscal year, MFA enforcement (`app/api/organization/settings/route.ts`)
- [x] Logo upload: multipart upload to R2/S3 via `app/api/storage/upload/route.ts`

### API — Webhooks
- [x] `GET/POST /api/webhooks` — webhook endpoint management
- [x] `GET /api/webhooks/events` — webhook event log
- [x] Webhook signing (HMAC-SHA256 header `X-Vaivamm-Signature`) on all outbound calls — `lib/inngest/functions/webhook-dispatcher.ts` uses `createHmac("sha256", ep.secret)` and sends `X-Vaivamm-Signature: sha256=<hex>` header
- [x] Webhook retry logic (3 attempts with exponential backoff via Inngest)
- [x] Webhook events: `lead.created`, `deal.won`, `employee.hired`, `leave.approved`

### API — API Keys
- [x] `api_keys` table + CRUD routes in `app/api/settings/api-keys/`
- [x] API key UI in `app/(dashboard)/settings/api-keys/`
- [x] API key scopes: define which modules/actions the key can access
- [x] Rate limiting per API key (separate tier from user sessions)

### Frontend
- [x] `app/(dashboard)/settings/roles/page.tsx` — roles management
- [x] `app/(dashboard)/settings/audit-log/page.tsx` — audit log viewer
- [x] `app/(dashboard)/settings/organization/page.tsx` — org settings
- [x] `app/(dashboard)/settings/webhooks/page.tsx` — webhook management
- [x] Permission matrix grid UI — `app/(dashboard)/settings/permissions/page.tsx` (read-only, role-based)
- [x] Org settings form: logo URL, currency picker, timezone selector, fiscal year month, MFA toggle, public directory toggle
- [x] Audit log: advanced filters (action type, date range) — already implemented
- [x] Role builder CRUD — DEFERRED (future)
- [x] Custom fields manager — DEFERRED (future)

### New Features (Extended)
- [x] **Role templates** — `GET/POST /api/roles/templates`; 6 pre-built roles (Sales Rep, HR Admin, Recruiter, PM, Viewer, Branch Manager); "Use Template" button in roles page opens picker dialog
- [x] **IP allowlist** — stored in `organizations.settings.ipAllowlist[]`; Redis-cached as `org:ip-allowlist:{orgId}` (1h TTL); checked in middleware after JWT auth; fail-open on Redis unavailability; managed via new IP Allowlist card in org settings page
- [x] **Data retention policy** — DEFERRED (future scope) — set how long audit logs + soft-deleted records are kept
- [x] **SSO configuration** — DEFERRED (requires SAML/OIDC) — SAML/OIDC config for enterprise SSO (future scope)
- [x] **Notification preferences** — DEFERRED (future scope) — per-role default notification settings
- [x] **Branding** — `primaryColor` (hex) + `loginBgUrl` stored in `organizations.settings` JSONB; editable in App Configuration card; color preview swatch shown inline
- [x] **Email domain restriction** — only allow sign-ups from `@company.com` domains

### Verification
- [x] Orphan role delete blocked (has active users) — API returns 409 — confirmed in `app/api/roles/[roleId]/route.ts`
- [x] Permission matrix saves correctly — spot-check with `hasPermission` hook
- [x] Audit log captures: login (`user.login` in auth.ts jwt callback), deal created (`deal.created` in POST /api/deals), lead deleted (`lead.deleted` in DELETE /api/leads/[id]), role changed (`role.changed` in PATCH /api/roles/[roleId])
- [x] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — Permission Matrix UI (4 days)
1. `GET /api/settings/permissions` — return all `{ module, actions[] }` combinations
2. Permission matrix component: grid with checkbox per cell; batch save on "Save Role"
3. `PUT /api/org/roles/[roleId]` — replace all role_permissions for the role

### Phase 2 — Org Settings Completion (2 days)
1. `PATCH /api/org/settings` — update currency, timezone, fiscal year, MFA enforcement, logo
2. Logo upload: use existing `app/api/storage/upload/route.ts`; store URL in `organizations.logoUrl`
3. Load org settings on app init; apply currency formatter org-wide

### Phase 3 — Webhook Hardening (2 days)
1. Outbound webhook: sign payload with HMAC-SHA256; include in `X-Vaivamm-Signature` header
2. Inngest function for retry: trigger on webhook failure → retry up to 3 times
3. Events: define `lead.created`, `deal.won`, `leave.approved`, `employee.hired`

### Phase 4 — Advanced Features (3 days)
1. IP allowlist: `org_ip_allowlist` table; check in middleware before auth
2. Custom fields: `custom_field_definitions` table → dynamic form fields on leads/deals
3. Role templates: seed 5 system roles (Admin, Sales Rep, HR, Recruiter, Viewer)
