# DOC-06 — Forms, Zod, and API Validation

## Outcome

Every Documents mutation has one contract: sibling `*-schema.ts` on the
frontend, matching DTO in the backend module `dto/`, identical requiredness,
and labels that tell the truth. Optional chrome on a required field is a bug.

## Form Standard

- `react-hook-form` + `zodResolver` + `z.infer`. No `useState` field soup.
- `EntityFormDialog` (≤5 fields) or `EntityFormSheet` (6+ / context).
- `*` on required labels; `(optional)` only when the field could be mistaken
  for required.
- `FormMessage` always mounted. `LoadingButton` on every async submit.
- Dirty close → `UnsavedChangesDialog`.
- Backend `@Validate` Zod is authoritative. Unknown fields rejected.
- Client never sends `orgId`, `userId`, `createdById`, or “me” as owner
  unless picking a **different** person.
- Empty optional text → omit/null, never whitespace.

## Current Source Findings

| Defect | Evidence |
|---|---|
| Only 2 real form schemas | `spaces-page-schema.ts`, `kb-note-schema.ts` |
| Space schema missing max 200/2000; audience optional | `spaces-page-schema.ts:3-8` vs `createSpaceSchema` |
| Space sheet does not reset on target switch | `space-sheet.tsx` |
| Import title required in handler, label has no `*` | `import-page.tsx:105-107, 241-264` |
| Note content max 50_000 vs API 200_000 | `kb-note-schema.ts` vs `createKbSourceNoteSchema` |
| Move page: no Zod | `move-page-dialog.tsx:56-58` |
| Metadata sheet: no Zod; owner field `ownerUserId`; verify 1–365 unvalidated | `page-metadata-sheet.tsx:114, 349-352` |
| Review note/reason: no max 2000 Zod | `reviews-page.tsx:122-243` |
| Save-as-template: trim only | `page-document-header.tsx:117, 194-218` |
| Comments: no 1–5000 schema | `page-comments-sheet.tsx:39-59` |
| Conversation rename: no 1–200 | `kb-conversation-list.tsx:238-248` |
| Tree rename: no title max 500 | `page-tree-item.tsx:171-185` |
| Trash retention: handler 1–365, no Zod / no `*` | `trash-retention-section.tsx:33-48` |
| Settings FE contract includes extra field | `chatHistoryRetentionDays` vs PATCH `trashRetentionDays` only |
| Metadata editable without `kb:pages:update` | `page-metadata-sheet.tsx:78, 228, 294` |

## Validation Matrix

### Space create / edit

| Field | Rule | Label |
|---|---|---|
| Name | required, trim, 1–200 | `Name *` |
| Description | optional, trim, max 2,000 | `Description (optional)` |
| Audience | required `internal \| public \| mixed`, default `internal` | `Audience *` |
| Icon | optional; one Unicode grapheme, max 8 UTF-8 bytes | `Icon (optional)` |
| Public help center | manager-only boolean; omit on ordinary wiki spaces | Contextual |

Reset defaults every time the sheet opens or the space id changes.

### Page create / title

| Field | Rule |
|---|---|
| Parent, space, template | optional positive id or null; ACL checked |
| Project | optional; immutable outside Build move |
| Title | draft may be empty; publish / review / share / export require trim 1–500 |

### Page editor / autosave

| Field | Rule |
|---|---|
| Title | max 500 |
| Icon | optional, max 100 |
| Cover | optional; storage key or approved preset id — not a free-form URL |
| Content | valid Plate document |
| Extracted text | max 200,000 |
| Change summary | optional, max 500 |
| `expectedContentRevision` | **required** whenever `content` is sent |

409 never overwrites. Conflict UI: reload / copy mine / retry.

### Page metadata

| Field | Rule | Label |
|---|---|---|
| Status | `draft \| in_review \| published \| archived` | `Status *` |
| Content type | backend enum only | `Type *` |
| Owner | active membership id; default creator | `Owner *` |
| Space | optional accessible space | `Space (optional)` |
| Visibility | `private \| org \| public` | via Share |
| Verification interval | integer 1–365 or indefinite | `Review every (days)` — required if not indefinite |

Disable fields without the exact mutation key. Owner is
`ownerMembershipId`, never a raw `ownerUserId` the client invents.

### Share / visibility

| Field | Rule |
|---|---|
| Visibility | required enum `private \| org \| public` |
| Public token | server-issued; copy only when a token exists (never `/wiki/null`) |
| Password / expiry | P2 (D22) — no `expiresAt` on P0 |

### Direct share grant (ADD — D03)

| Field | Rule | Label |
|---|---|---|
| Target membership | required existing org member, not self-as-owner no-op | `Person *` |
| Access | required `view \| comment \| edit` matching backend | `Access *` |
| Revoke | existing grant id; actor needs `kb:pages:update` | — |

Frontend + backend Zod. Ineligible recipients (inactive, no org membership)
are omitted from the picker. Stale grants after membership revocation fail
closed on read. Recipient search is bounded (not `/chat/users` dump).

### Move page

| Field | Rule | Label |
|---|---|---|
| Parent page | optional id or null (root) | `New parent` |
| Index | integer ≥ 0; default end of sibling list, not hard-coded `0` | hidden or `Position` |
| Space | if changing space, must be accessible | `Space` |

Frontend + backend reject a move under a descendant.

### Import paste / files

| Field | Rule | Label |
|---|---|---|
| Title (paste) | required, trim, 1–200 | `Title *` |
| Body | required, trim, max 200,000 | `Content *` |
| Files | 1–100; allowed mime; max size from settings | `Files *` |
| Target space | optional accessible | `Space (optional)` |
| Target parent | optional accessible page | `Parent (optional)` |
| Duplicate policy | required enum `skip \| rename \| replace`, default `skip` | `If a page already exists *` |

### Export job

| Field | Rule |
|---|---|
| Page ids or space id | one required |
| Format | `markdown \| html \| zip` as backend allows |

### Review approve / reject

| Field | Rule | Label |
|---|---|---|
| Approve note | optional, max 2,000 | `Note (optional)` |
| Reject reason | required, trim, 1–2,000 | `Reason *` |

### Save as template

| Field | Rule | Label |
|---|---|---|
| Name | required, trim, 1–200 | `Template name *` |
| Description | optional, max 2,000 | `Description (optional)` |

### Comments

| Field | Rule | Label |
|---|---|---|
| Body | required, trim, 1–5,000 | `Comment *` |

### Record links

| Field | Rule |
|---|---|
| Target type + target id | required, exist, tenant-scoped |

### Trash retention (settings)

| Field | Rule | Label |
|---|---|---|
| Days | required integer 1–365 | `Keep deleted pages for (days) *` |

PATCH `/kb/settings` accepts **only** `trashRetentionDays` until another
setting is approved. Delete the extra FE field.

### Source note

| Field | Rule | Label |
|---|---|---|
| Title | required, 1–200 | `Title *` |
| Content | required, 1–200,000 (match API) | `Content *` |
| Space | optional accessible | `Space (optional)` |

### Conversation rename

| Field | Rule | Label |
|---|---|---|
| Title | required, 1–200 | `Name *` |

### Space members (ADD sheet)

| Field | Rule | Label |
|---|---|---|
| Membership | required existing org member | `Member *` |
| Role | required enum matching backend | `Role *` |

## API-Level Gaps to Close

- Move, metadata, reviews, comments, template-save, retention, conversation
  rename, record links, import paste, bulk payload — each needs a named
  backend Zod DTO if one is missing or looser than this matrix.
- `updateArticleSchema` always requires `expectedContentRevision` — confirm
  the support hook sends it.
- Page tree `status` / `visibility` frontend contracts must be enums, not
  `z.string()`.
- Bulk endpoint schema is part of DOC-05-008.

## Todos

- [ ] **DOC-06-001** Rewrite `spaces-page-schema.ts` to the matrix; use
      `EntityFormSheet`; reset on open/id change; labels with `*`.
- [ ] **DOC-06-002** Import paste: `*-schema.ts`, `Title *`, target space/
      parent, duplicate policy.
- [ ] **DOC-06-003** Align note max with API (200,000); add optional space.
- [ ] **DOC-06-004** Move dialog Zod + descendant error from API.
- [ ] **DOC-06-005** Metadata sheet: sibling schema, `ownerMembershipId`,
      interval 1–365, `kb:pages:update` gate.
- [ ] **DOC-06-006** Review dialogs via `EntityFormDialog` + Zod max 2,000.
- [ ] **DOC-06-007** Template save, comments, conversation rename, tree
      rename, record links, retention — each a `*-schema.ts` + matching DTO.
- [ ] **DOC-06-008** Strip `chatHistoryRetentionDays` from the FE settings
      contract.
- [ ] **DOC-06-009** Contract tests: required field 400; optional empty
      accepted; label/required mismatch fixture; unknown field rejected.
- [ ] **DOC-06-010** UnsavedChangesDialog on space, metadata, import draft,
      and comment compose when dirty.
- [ ] **DOC-06-011** Direct-share grant schema + API (target membership,
      access enum, revoke) matching D03.

## Acceptance

- [ ] Grep of `frontend/features/wiki` finds no mutation form without a
      sibling schema.
- [ ] A required field never renders without `*`.
- [ ] Frontend and backend min/max/enum match for every row in this matrix.

## Evidence Log

_Empty until DOC-06-001 through DOC-06-010 close._
