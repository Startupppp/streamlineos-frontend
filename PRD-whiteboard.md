# StreamlineOS PRD (v1 · Implementation-Grade)
## Project Whiteboards — tldraw-class canvas with sharing & access restrictions

**Owner (PM)**: StreamlineOS Platform
**Owner (Eng)**: Projects / Collaboration
**Status**: Implementation-ready (grounded in current repo state)
**Last updated**: 2026-07-02
**Scope**: Frontend `frontend/` + Backend `backend/` (NestJS, port 1500)

## UI/UX source of truth

- **Source of truth**: `PRD-ui-ux-system.md` / `UI-UX-SYSTEM.md`
- **Canonical UI references**: `/signin` and `/signup`

---

## 1) Vision (why this exists)

Give every project a tldraw-style infinite canvas for visual collaboration — brainstorms, diagrams, flows, retro boards — that can be kept private, shared with the project, shared with specific people at specific permission levels, or published via a restricted public link. Sharing must be enforced at the backend data layer (BOLA-safe), never in the client.

## 2) Current state (audit)

Already shipped (reuse, do not rebuild):
- **Canvas engine**: `@excalidraw/excalidraw@0.18.1` (already a dependency — chosen over adding `tldraw`, whose SDK carries a watermark license; Excalidraw is MIT and already integrated).
- **Frontend**: `app/(authenticated)/projects/[projectId]/whiteboard/page.tsx` (board list + canvas), `features/projects/whiteboard/excalidraw-canvas.tsx`, hooks in `hooks/api/projects/whiteboards.ts`.
- **Backend**: `WhiteboardsController` (`projects/:projectId/whiteboards`), `WhiteboardsService` (tenant-scoped CRUD), table `project_whiteboards`.

Known defects to fix in this release:
- **P0 contract bug**: frontend saves an Excalidraw scene object (`{elements, appState, files}`) but `updateWhiteboardSchema` still validates the legacy custom element array (`note|rect|ellipse|text`) — every save 400s. Backend schema/DTO must move to the Excalidraw scene contract.
- `elementCount` in the list endpoint counts the legacy array; must count `data.elements`.
- Manual save only — no autosave, edits are silently lost on navigation.

## 3) Outcomes

### 3.1 User outcomes
- A project member can create a board and draw with the full Excalidraw toolset; work autosaves.
- The board owner can set visibility: **Private** (owner + invited people), **Project** (default — anyone with project access), **Public link** (anyone holding the link).
- The owner can invite specific org members as **viewer** or **editor**.
- The owner can restrict the public link: view-only vs editable, expiry date, disable export/download, and revoke (regenerate) the link at any time.
- A person opening a valid public link sees the board with no login; view-only links render a read-only canvas; expired/revoked links show a friendly error.

### 3.2 Engineering outcomes
- Every read AND write re-asserts object-level access in `WhiteboardsService` (visibility + share role + tenant), not in middleware or the client.
- Public endpoints are rate-limited, return sanitized payloads (no `orgId`, `createdBy`, internal ids beyond what rendering needs), and treat invalid/expired/revoked tokens identically (generic 404).
- Build + lint + typecheck green in both repos; migration generated via `drizzle-kit generate` (apply pending TTY, consistent with other pending migrations).

## 4) Access model (definitive)

Roles resolved server-side per request, most-permissive wins:

| Actor | View | Edit content | Rename | Delete | Manage sharing |
|---|---|---|---|---|---|
| Creator / org owner / platform admin | ✔ | ✔ | ✔ | ✔ | ✔ |
| Org member (visibility `project`/`public`) | ✔ | ✔ with `projects:write` | ✔ with `projects:write` | ✖ | ✖ |
| Invited **editor** (any visibility) | ✔ | ✔ with `projects:write` | ✖ | ✖ | ✖ |
| Invited **viewer** (any visibility) | ✔ | ✖ | ✖ | ✖ | ✖ |
| Org member NOT invited (visibility `private`) | ✖ | ✖ | ✖ | ✖ | ✖ |
| Anonymous with valid public link | ✔ | ✔ only if link access = `edit` | ✖ | ✖ | ✖ |

Rules:
- Org RBAC (`projects:write` via `PermissionGuard`) remains the outer gate for authenticated writes; board shares **restrict further, never widen** module permissions.
- Private boards are excluded from the board list for non-creator/non-invited members.
- Deleting and sharing are creator/owner-only even for members holding `projects:write` (restriction on top).
- Public link: single unguessable token (`crypto.randomBytes(24)` base64url), nullable `linkExpiresAt`, `publicAccess ∈ {view, edit}`, `allowExport` boolean. Regenerating the token revokes all previously shared links. Setting visibility away from `public` disables the link immediately.
- Public edit writes only `data` (never name/visibility/shares) and is rate-limited per IP.

## 5) Backend contract

Schema (`backend/src/db/schema/projects/whiteboards.ts`):
- `project_whiteboards` gains: `visibility whiteboard_visibility NOT NULL DEFAULT 'project'`, `public_access whiteboard_share_role NOT NULL DEFAULT 'viewer'`, `share_token text UNIQUE`, `link_expires_at timestamp`, `allow_export boolean NOT NULL DEFAULT true`; `data` becomes an Excalidraw scene object (legacy array rows reset to empty scene in migration — legacy boards are unrenderable in Excalidraw anyway).
- New `project_whiteboard_shares`: `id`, `org_id`, `whiteboard_id` (FK cascade), `user_id`, `role whiteboard_share_role`, `created_by`, `created_at`; unique `(whiteboard_id, user_id)`; index `(org_id, whiteboard_id)`.
- New enums: `whiteboard_visibility = project|private|public`, `whiteboard_share_role = viewer|editor`.

Authenticated endpoints (existing controller, `JwtAuthGuard + PermissionGuard`):
- Existing CRUD unchanged in shape; service adds object-level ACL; `GET :whiteboardId` returns board + caller's effective `access` + share summary for managers.
- `PATCH :whiteboardId/sharing` (`projects:write`, manager-only): `{visibility?, publicAccess?, linkExpiresAt?, allowExport?}`; switching to `public` mints `share_token` if absent.
- `POST :whiteboardId/sharing/rotate-token` (manager-only): regenerates token.
- `PUT :whiteboardId/shares` (manager-only): replace-style upsert `{userId, role}[]` (≤100), self/creator excluded, users validated as org members.
- `DELETE :whiteboardId/shares/:userId` (manager-only).

Public endpoints (`@Public()`, `public/whiteboard-links`):
- `GET :token` → `{name, data, access, allowExport, updatedAt}`; 404 on unknown/expired/non-public; rate tier `whiteboard:public-view` (60/min/IP).
- `PATCH :token` → `{data}` when `publicAccess='edit'`; rate tier `whiteboard:public-edit` (30/min/IP); payload cap enforced by Zod (~2 MB serialized guard via element/file caps).

## 6) Frontend

- Whiteboard page: share button (gated `<Can permission="projects:write">` + manager check from detail payload) → **Share dialog** (visibility radio, member invites with role select, public-link controls: access, expiry, export toggle, copy, regenerate) matching existing Dialog patterns.
- Canvas: autosave — `getSceneVersion` change detection + 2s debounce + flush on unmount; status chip (Unsaved/Saving/Saved); manual save retained.
- Public route: `app/(public)/board/[shareToken]/page.tsx` — no authenticated shell; view-only links render `viewModeEnabled`; export UI hidden when `allowExport=false`; friendly invalid/expired state.
- Boards list shows a visibility badge (private lock / public globe).

## 7) Non-goals (v1)

- Realtime multiplayer cursors/co-editing (needs a websocket sync server; Ably exists but scene CRDT merging is a separate workstream).
- Sharing to external emails (magic-link invitations) — org members only in v1.
- Password-protected links, per-link analytics, embeds.
- Board templates, board-level comments.

## 8) Definition of Done

Build ✓ · Lint ✓ · Types ✓ (both repos) · ACL enforced in service layer on every read/write · public token 404-generic + rate-limited · migration generated · `PAGES.md` updated · states (loading/empty/error/expired) present · responsive 375/768/1280.
