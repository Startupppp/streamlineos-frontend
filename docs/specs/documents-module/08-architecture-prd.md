# DOC-08 — Architecture and Cross-Module Boundaries

## Outcome

Documents has one knowledge system of record, one ACL story, one permission
catalog, and acyclic ownership. Dual models that remain during dual-run are
named, time-boxed, and not treated as two products forever.

## Current Source Findings

| Mistake | Evidence | Fix |
|---|---|---|
| Dual content models (`kb_pages` vs `kb_articles`) | `pages.ts`, `support/kb.ts`, article-migration module | D01: pages are wiki truth; articles are help-centre until cutover; no new wiki writes to articles |
| Page ACL weaker than article ACL | `kb-page-visibility.ts` vs `kb-access.service.ts` | One `KbAccessService` for both |
| Frontend permission catalog stale | 9 vs 22 keys | D10 / DOC-07-032 |
| AI billed on `:view` | ask / page-AI / article-AI controllers | `kb:ai:generate` |
| Org-wide analytics and sources | services listed in DOC-07 | Space + record ACL |
| Shared/My pages computed in the client | `shared-page.tsx`, `private-page.tsx` | Server list contract |
| Tree used as a list API | every catalog page calls `useKbPagesTree` | Dedicated list endpoint |
| Unwired APIs (members, tags, translations, verification queue) | no frontend hooks | Wire members; hide or deprecate the rest until a page needs them |
| Split hook namespaces | `knowledgeAndSurveysQueryKeys` vs `supportKb` | Correct during dual-run; migration invalidates both |
| Research briefs under Support | `/support/kb/research-briefs` | MOVE P1 (D07) |
| Support knowledge-gap draft creates an article then links a wiki URL | Support gap flow | Write a `kb_pages` draft or keep the article URL until cutover — never mix ids |
| Settings read gated on manage | `settings.ts` | OK; do not invent a reader settings page (D04) |
| `tenant_ai_credits` lives under `schema/kb` | `kb/credits.ts` | Leave it; do not “fix” ownership in this program unless a billing PRD claims it |
| Cross-schema FK pages → articles | `pages.ts` `sourceArticleId` | Intentional bridge; drop after cutover |
| Client duplicate of descendant-move check | `move-page-dialog.tsx` + tree service | Keep backend authoritative; FE is UX only |
| Import graph | wiki feature → hooks → query keys; Build wiki imports wiki feature | Keep; never import `app/**/page.tsx` |

## Ownership Map

| Concern | Owner | Must not |
|---|---|---|
| Page entity, versions, comments, shares | `backend/src/modules/kb/wiki` | Live in Build or Support |
| Spaces, members, archive | kb wiki | Merge with HR hierarchy |
| Ask, conversations, retrieval chunks | `kb/retrieval` | Call providers from the frontend |
| Help-centre articles, categories, public `/help` | `kb/help-centre` until cutover | Author org wiki into articles |
| Article → page migration | `kb/article-conversion` | Run implicitly on every read |
| Project wiki UI | `features/wiki` + thin Build route | Second editor |
| Employment files | HR / `/me/documents` | Appear as wiki pages |
| Permission keys | `modules/rbac/permissions/kb.ts` + frontend twin | Frontend-only keys |
| Query keys | `knowledge-and-surveys.ts` | Hand-typed arrays |
| Plate list model | `components/editor/plate/plate-list-model.ts` | A second indent model |
| Uploads / signed URLs | existing files/media infra | New blob product |

## Dual-Run Rules (D01 / D07)

1. Wiki authoring writes `kb_pages` only.
2. Help-centre authoring may still write `kb_articles` until DOC-11 cutover.
3. Ask retrieval may index both; citations must name the record type and
   open the correct URL (`/knowledge/wiki/doc/:pageId` vs
   `/support/kb/:articleId` vs `/help/...`).
4. Gap analytics that today insert an article and then link a wiki path
   must be repaired before P0 release (wrong destination = DOC-01 defect).
5. Cutover checklist lives in DOC-11. After cutover, article write paths
   are deleted.

## Cycle and Boundary Rules

- No `forwardRef` to break KB internal cycles; extract the leaf service.
- `import type` never used on a Nest-injected KB service.
- Frontend wiki must not import `features/support/**` or `features/hr/**`.
- Support may deep-link to wiki routes; it may not own page mutations.
- Build may pass `projectId` into wiki components; it may not define page
  Zod or ACL.
- Run `pnpm check:cycles` on both repos before claiming DOC-08 done.

## Missing Product Architecture (add)

| Gap | Decision |
|---|---|
| Share-grant model for “Shared with me” | First-class page share rows (membership + access). Visibility `org`/`public` is not a share. |
| Space archive | Status mutation, same pattern as hierarchy |
| Page list API | New, not tree |
| Bulk command API | New (DOC-05) |
| Facets API | P0 enums; P1 counts |
| Members UI | Exists in API, missing hooks/page |
| Tags / translations / verification queue | Help-centre only; do not port to pages in P0 |

## Todos

- [ ] **DOC-08-001** Route all page visibility through `KbAccessService`
      (space + visibility + project + creator + share grant).
- [ ] **DOC-08-002** Add page-share schema + service used by Shared with me
      and the Share popover (people, not only visibility enum).
- [ ] **DOC-08-003** Fix Support gap-draft URL/id mismatch (article vs page).
- [ ] **DOC-08-004** Deprecate or auth-hide unwired tag / translation /
      verification endpoints until a page consumes them.
- [ ] **DOC-08-005** Document citation URL mapping for mixed retrieval.
- [ ] **DOC-08-006** `pnpm check:cycles` + `:self-test` both repos after
      the access-service move.
- [ ] **DOC-08-007** Knip + build before deleting any schema file
      (`kb_articles` stays until cutover even if knip yells).
- [ ] **DOC-08-008** No new `app/api/**` business route and no frontend
      `lib/services/**` for KB.
- [ ] **DOC-08-009** Drop `RequireModule` on read surfaces (D17).
- [ ] **DOC-08-010** Record ACL 404 vs route `NoPermissionState` (D18).
- [ ] **DOC-08-011** Audit events (append-only) for: visibility, public
      token rotate/revoke, share grant CRUD, publish/archive, lock,
      verify, review decide, space archive/members, import/export, purge,
      migration. Event, actor, tenant, subject, before/after.

## Acceptance

- [ ] One ACL function on every page read path.
- [ ] One permission catalog pair.
- [ ] Zero cycles.
- [ ] Dual-run rules have a cutover owner in DOC-11.

## Evidence Log

_Empty until DOC-08-001 through DOC-08-008 close._
