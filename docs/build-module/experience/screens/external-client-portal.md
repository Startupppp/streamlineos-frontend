# External client portal screens

Status: Planned target with Current unverified page/source anchors  
Audience: external client contacts holding a valid project grant

The current repository has browser pages at `frontend/app/(portal)/client-portal/page.tsx` and `frontend/app/(portal)/client-portal/[projectId]/page.tsx`. They render a granted-project list and project overview with milestones, tasks, attachments, updates, and change-request UI. This is **Current unverified** source evidence; it does not prove grant activation, safe files, persistence, or revocation in a running environment. The broader tab set below is **Planned** or **Conditional** on grant capabilities.

## Shared portal shell and access

- Header shows client/project identity, organization contact, accessible-project switcher, and account/security actions. No internal Build sidebar, role names, hidden counts, or ungranted project names appear.
- Entry uses a short-lived, audience-bound magic link exchange. The raw token is removed from browser history after exchange; sessions are constrained by grant ID/version, project, capabilities, expiry, and revocation.
- Every page and file read rechecks grant and record publication. A portal actor never acquires organization or Build module membership.
- Tab visibility is a client-safe capability projection. A hidden tab does not authorize its URL; direct URL access rechecks the same grant.
- Common states are loading skeleton, no granted projects, no published content, filtered empty, expired link, revoked grant, inaccessible artifact, source failure, and retry. Denied responses reveal no private project/title/count.
- Mobile uses the same actions and a compact tab selector. Keyboard focus, labels, 44 px targets, and Back/Forward behavior follow the shared screen contract. Portal records open full pages rather than an internal Build pane.

## `/client-portal` — granted projects

**Entry:** magic-link completion, project switcher, or return from a project. **Layout:** heading, one line of context, project grid/list switch, optional search when the client has enough projects to benefit. **Card fields:** approved project key/name, published description, safe status, next milestone/date, waiting-on-client count derived only from granted actions, and capability chips. Do not show internal health, private budget, total tickets, hidden assignees, or staff-only project metadata.

**Filters:** project name contains, published status IN, waiting-on-me boolean; stable sort by name/recent update. All filters apply after grant scope in the server query. **Click:** project card opens `/client-portal/[projectId]` as a full page; Back restores filter, sort, and scroll. **Actions:** open project, request a new link, contact project owner through the approved channel. No project creation or internal invitation action.

**Data interface:** `PortalProjectsQuery.list({actorGrant, cursor, filter, sort})` returns bounded client-safe cards and `pageInfo`; generated HTTP operation is resolved from current portal controller during implementation. Response schema rejects internal project fields; each card includes `projectId`, `grantRevision`, `capabilities`, `sourceRevision`, and `generatedAt`. Cache is private to client session/grant version and invalidates on grant/publication changes. **Acceptance:** grant to project A never lists project B; expiry/revocation empties active and cached access; refresh/direct link/mobile produce the same authorized result.

## `/client-portal/[projectId]` — project overview

**Entry:** project card, magic-link target, approved notification. **Layout:** project heading/status, next action strip, approved summary/update, then capability-filtered tabs: Overview, Deliverables, Requests, Approvals, Files, Updates, and Invoices. Tabs may be rendered as subroutes or URL state; each has a stable canonical link and survives refresh. The overview can display a preview of each granted tab, but it never fetches or counts an ungranted tab.

**Overview fields:** published project name/description/status, next milestone, last approved update, contact, and client action counts. **Filters:** none on the summary. **Click:** an action opens the corresponding full portal record view. Internal Ticket links never expose the internal Build URL or hidden fields. **Data interface:** `PortalProjectQuery.getOverview({grant, projectId})`; response is a named safe projection with publication revision, allowed actions, source revision, and generated time. The route param is validated as one complete positive identifier, never accepted through partial parsing. **Acceptance:** wrong project or revoked grant gives neutral inaccessible state; a newly unpublished artifact disappears from overview and direct detail.

## Conditional portal tabs and record details

| View | Card/row fields and filters | Click/action and owner interface | Cache and acceptance |
|---|---|---|---|
| Deliverables | approved title, kind, milestone/release, published version, due date, review state; filter status/kind/date | full portal detail; preview/download approved artifact, request changes or accept through the owning approval/change command | publication/grant version key; old artifact versions cannot be approved after replacement |
| Requests | request key, title, submitted date, client-safe state, last update, linked public response; filter state/type/date | request detail; submit Form, comment, upload; Intake/Triage preserve source and Ticket mapping | submit idempotency and file scan; no internal priority or hidden assignee leak |
| Approvals | artifact title/version, requester, due, action required, decision history; filter pending/completed/overdue | decision page/sheet with exact artifact version; approve, reject, request changes through Approval command and portal actor | decision is CAS/idempotent; changed artifact invalidates stale approval |
| Files | approved filename/type/size/version/uploader display/date; filter type/date/milestone | preview/download through Files authorized signed access; upload only where grant permits | signed URL short lived; revoke blocks new URL; malware/retention policy applies |
| Updates | published title/body excerpt/author display/time/acknowledgment; filter date/type | full published update; acknowledge/comment only through domain command and capability | only published revision; edits preserve history and client-safe comment visibility |
| Invoices and payments | Accounting invoice number, amount/currency, due date, reconciled status, authorized document; filter status/date | open Accounting client-safe invoice and Razorpay action when enabled; return to portal | no payment-success claim before Accounting reconciliation; amounts never aggregate across currencies silently |

Wiki pages, individual Tickets, milestones, feedback, and other record types can be linked from these views only when their own portal projection and grant capability are implemented and tested. A tab is not a blanket publication permission.

## Operations, schema, and failure behavior

- Grant schema: client contact identity, project ID, capability set, state, expiry, revision, created/revoked actors, and audit reference. Raw link tokens are hashed and never returned in list responses.
- Publication schema: typed source record ID/version, project ID, client-safe field set, publish revision, allowed actions, and effective time. Mutations use expected revision and idempotency where retryable.
- Response schemas omit forbidden fields entirely; redacted placeholder counts can themselves leak data. API and browser caches include grant version, publication version, project, actor/session, filter, and source revision.
- Files use File identity and a separate authorized access check. The current source's `PortalAttachment.url` rendering must be audited before it can satisfy the signed-file requirement.
- Failed email delivery leaves an activated grant with visible delivery failure and resend; it does not produce a false success message or duplicate grant.
- Every portal mutation writes actor-attributed audit and outbox intent after canonical owner authorization. Notification links resolve only to portal-safe destinations.

## Verification

Exercise new/existing client, multiple grants, wrong identity, expired/replayed magic link, project A/B isolation, unpublished item direct URL, changing artifact during approval, file revocation, duplicate request submission, mobile, keyboard, refresh, Back/Forward, and current-session revocation. Record browser network/console, persisted grant and action rows, signed-file expiry, cache timing, and deployed revision separately.

## Delivery checklist

Track completion in the [requirement ledger](../../implementation/REQUIREMENT-LEDGER.md) and [work claims](../../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [ ] Implement audience-bound magic-link exchange and grant-scoped portal shell; remove raw tokens from history and keep internal Build navigation/counts out of responses and UI.
- [ ] Deliver `/client-portal` with only granted project cards, safe status/milestone/action counts, name/status/waiting filters, bounded cursor pagination, and full-page card navigation.
- [ ] Deliver `/client-portal/[projectId]` with published overview and capability-filtered tabs that survive refresh; direct tab and record URLs must reauthorize the same grant.
- [ ] Implement Deliverables, Requests, Approvals, Files, Updates, and conditional Invoices with the specified safe row fields, filters, source-owner commands, revision checks, and portal-only return paths.
- [ ] Bind signed file access and cache keys to actor/grant/publication revisions; revoke sessions and future URLs immediately, and suppress newly unpublished or cross-project artifacts.
- [ ] Show accurate expired, revoked, delivery-failed, no-project, no-published-content, filtered-empty, and partial-source states without exposing hidden project names or counts.
- [ ] Verify new/existing client, wrong identity, A/B project isolation, replayed link, stale approval, duplicate submission, file revocation, Back/Forward, keyboard/mobile, persisted audit, and deployment revision.
