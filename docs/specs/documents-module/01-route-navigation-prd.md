# DOC-01 — Route and Navigation Integrity

## Outcome

No sidebar item, card, citation, breadcrumb, command, notification, empty-state
link, or Back control lands on a known 404 or a predictable access-denied page.
Every retained route has a safe parent and the states a customer can actually
hit.

## Current Source Findings

| Defect | Evidence |
|---|---|
| Root `PAGES.md` lists `/knowledge/wiki/recent`, `/favorites`, `/settings` | `PAGES.md:470-471` — those `page.tsx` files do not exist |
| `/knowledge-base` documented as a redirect; it 404s | `PAGES.md:472`; `frontend/PAGES.md:686` marks it RETIRED; no `next.config` redirect |
| Mobile wiki rail is hidden | `wiki-shell.tsx:132` `hidden md:flex` |
| Sidebar shows Templates, Import, Spaces, Trash without `useCan` | `wiki-sidebar-nav.tsx:90-117` — only Reviews and Analytics are gated |
| Trash route gate ≠ trash hook gate | Route `kb:pages:purge` vs `useKbPagesTrash` on `kb:pages:view` |
| `/support/kb` and research briefs have no sidebar entry | `sidebar-nav-groups-knowledge-support.ts:167-180` |
| `/knowledge` and `/kb` / `/docs` missing from `frontend/PAGES.md` | Redirect pages exist |
| Reviews missing from root `PAGES.md` checklist | Route exists |
| Build project wiki home has no back to the project | Relies on Build sidebar only |
| `/ask` duplicates Ask KB | `frontend/app/(authenticated)/ask/page.tsx` |
| Space id `NaN` does not `notFound()` | `spaces/[spaceId]/page.tsx:14` |
| Not-found recovery links Trash / Spaces | `kb-page-not-found.tsx:71-91` — those routes can 403 (D18) |
| Space detail `backHref` always Spaces list | Users without `kb:spaces:view` get Access Denied |
| Public share copies `/wiki/${token}` when token is null | `page-share-popover.tsx:61-69` |
| Read pages wrap `RequireModule module="kb"` | Conflicts with constitution §8 (D17) |

No in-app `href` currently points at `/recent`, `/favorites`, or `/settings`.
The 404 risk is bookmarks, docs, and any future link written from the stale
root catalog.

## Route Truth Contract

- Canonical constants live in `frontend/lib/knowledge-routes.ts`. Callers do
  not hard-code wiki paths.
- Compatibility aliases `/kb` and `/docs` stay and are documented.
- Legacy `/knowledge/wiki/pages/:pageId` stays as a `next.config` redirect.
- `/knowledge-base` gains the same redirect to `/knowledge/wiki`.
- `/ask` redirects to `/knowledge/chat` (D21).
- Do not add recents, favorites, or settings routes (D04).
- Invalid `[pageId]` / `[spaceId]` / `[briefId]` call `notFound()` after a
  finite-number guard.

## Back and Off-Ramp Contract

| Surface | Back behavior |
|---|---|
| Ask KB, Wiki Home, My pages, Shared, Spaces list, Templates, Reviews, Import, Analytics, Trash | No `backHref` — they are sidebar destinations |
| Page document | Breadcrumb: Wiki → accessible ancestors → current title |
| Page history | `backHref` = that page |
| Space detail | `backHref` = Spaces list if `kb:spaces:view`, else Wiki Home |
| Full search (ADD) | `backHref` = Wiki Home |
| Content management (P1 ADD) | `backHref` = Wiki Home |
| Research brief detail | `backHref` = research-briefs list |
| Help-centre article | `backHref` = `/support/kb` |
| Public share / public help | No authenticated back; brand home only |
| Build project wiki page | Link to `/build/[projectId]/wiki` |
| Build project wiki history (ADD) | `/build/[projectId]/wiki/[pageId]/history` — same versions API; back to the project page |
| Build project wiki home | Build sidebar; optional `backHref` to project overview |
| Page not found | Primary CTA → Wiki Home |
| Deleted page | `router.push(KNOWLEDGE_BASE)`, never `router.back()` |

Never use `router.back()` as the only recovery from a detail or 404.

## 404 and Denial Contract

- Record ACL denial is **404** (D18). `KbPageNotFound` primary CTA is Wiki
  Home only.
- A known-inaccessible **admin route** is absent from nav. If reached by URL,
  it renders `NoPermissionState` with the exact key — never `EmptyState`
  “Access restricted” and never a record 404.
- Compatibility aliases never 404.
- Command palette and citations resolve through the same destination model.

## Loading / Error Coverage

Every authenticated Documents route needs `loading.tsx` or an in-page skeleton
that matches the real layout, plus `error.tsx` with `reset()` at the knowledge
layout (already present) or the wiki layout.

- [ ] **DOC-01-001** Add `/knowledge-base` → `/knowledge/wiki` in
      `frontend/next.config.ts`. Verify `/kb` and `/docs` still redirect.
- [ ] **DOC-01-002** Rewrite root `PAGES.md:470-472` to match
      `frontend/PAGES.md`. Remove `/recent`, `/favorites`, `/settings` as
      routes. Document `/knowledge` redirect and `/kb` / `/docs`.
- [ ] **DOC-01-003** Add `/knowledge` and alias rows to `frontend/PAGES.md`.
- [ ] **DOC-01-004** Grep both repos for `knowledge/wiki/recent`,
      `favorites`, `settings`, `knowledge-base` hrefs after the redirect
      lands. Zero stale callers except the redirect and this PRD.
- [ ] **DOC-01-005** Mobile wiki Drawer (DOC-03) so Library / Manage / Trash /
      Quick find are reachable below `md`.
- [ ] **DOC-01-006** Permission-filter every wiki nav item (DOC-03). No
      Templates / Import / Spaces list / Trash link without the matching key.
- [ ] **DOC-01-007** Align Trash: members who can view deleted pages they
      own may open Trash; purge/empty requires `kb:pages:purge`. Route access
      must not 403 a restore-capable author.
- [ ] **DOC-01-008** Replace Reviews / Import / Shared / Private / Spaces
      denied-as-empty with `NoPermissionState` or `ErrorState` + retry.
- [ ] **DOC-01-009** Add Help centre to Documents product nav
      (`kb:articles:view`). Add research-briefs child or the moved P1 route.
- [ ] **DOC-01-010** Build wiki home: `backHref` to the project overview
      when `projectId` is set.
- [ ] **DOC-01-011** Full search route `/knowledge/wiki/search` (DOC-02,
      DOC-04) with `backHref` to Wiki Home.
- [ ] **DOC-01-012** Browser proof: every KEEP/ADD path in DOC-02 at 375 /
      768 / 1280, including aliases, a bogus `pageId`, a denied admin URL, and
      browser Back from history → page → wiki.
- [ ] **DOC-01-013** Redirect `/ask` → `/knowledge/chat`; delete the orphan
      page after callers move (D21).
- [ ] **DOC-01-014** `notFound()` on non-finite `spaceId` / `pageId` /
      `briefId`.
- [ ] **DOC-01-015** `KbPageNotFound` off-ramps are Wiki Home only (D18).
- [ ] **DOC-01-016** Space detail backHref respects `kb:spaces:view`.
- [ ] **DOC-01-017** Share popover does not copy a `/wiki/` URL without a
      token.
- [ ] **DOC-01-018** Drop `RequireModule` on read surfaces (D17).
- [ ] **DOC-01-019** Add `/build/[projectId]/wiki/[pageId]/history` so
      project chrome is preserved.

## Acceptance

- [ ] Zero navigation, card, citation, or empty-state link reaches a missing
      file route.
- [ ] Every detail page has a deterministic `backHref` from the table above.
- [ ] Denied admin URLs render `NoPermissionState`, not 404 or empty success.
- [ ] `frontend/PAGES.md` and root `PAGES.md` agree with the shipped tree.

## Evidence Log

_Empty until DOC-01-001 through DOC-01-012 close._
