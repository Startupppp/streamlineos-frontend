# Temporary architecture reviews: triage and PRD backlog

**Reviewed:** 2026-10-10. **Scope:** `architecture-review*.html` in the local OS Temp directory. These are historical, source-informed review candidates, not proof that a defect still exists in the current checkout. Reproduce against current code and runtime before changing implementation or closing a task. Existing uncommitted work in the frontend and backend repositories is outside this documentation pass.

## PRD and to-do files

- [Knowledge Base and Documents](01-knowledge-documents-prd.md): 14 mapped architecture items and six historical defect checks.
- [Platform access and shared modules](02-platform-access-prd.md): 18 mapped items covering identity, authorization, admission, providers and money.
- [Build, Chat and Companion](03-build-chat-companion-prd.md): 17 Build regression checks, eight Chat items and five Companion verification items. The October 2 Build package list remains in the existing canonical Build registry.

These are traceability files. Work already represented in `docs/specs/knowledge-base/OPEN-TASKS.md`, Build `ARCH-*` packages or Companion PRDs is linked rather than counted again as new delivery work. A conditional cleanup row does not authorize deletion on its own.

## Decisions and source disposition

| Temp HTML | Disposition | Reason / durable owner |
| --- | --- | --- |
| `architecture-review-20260926-153104.html` | Keep | Distinct Knowledge Base defect and architecture review; reconcile with `docs/specs/knowledge-base/OPEN-TASKS.md`. |
| `architecture-review-20260926-201335.html` | Keep | Distinct cross-platform security and access candidates. |
| `architecture-review-20260926-213335.html` | Keep | Distinct Build collection and concurrency candidates. |
| `architecture-review-20260926-224038.html` | Keep | Distinct Documents ownership and schema analysis. |
| `architecture-review-20260926-230544.html` | Keep | Distinct Build RLS, write and query findings. |
| `architecture-review-20260930-213115.html` | Keep | Cross-module deep-module candidates. |
| `architecture-review-20260930-230621.html` | Keep | Distinct RBAC architecture review. |
| `architecture-review-20260930-231834.html` | Keep | Distinct Chat architecture review. |
| `architecture-review-20261002-184500.html` | Keep | Dated canonical Build review for the October 2 series. |
| `architecture-review-20261008-225504.html` | Keep | Distinct Companion implementation candidates. |
| `architecture-review-20261008-decision.html` | Removed from Temp | The corrected copy is `docs/pet/architecture-review.html`; the source findings and selected decision are recorded in `docs/pet/architecture-review.md` and ADR 0007. |
| `architecture-review-20261008-universal-companion.html` | Removed from Temp | Its immediate-write audit concern is retained in `docs/pet/architecture-review.md` and `docs/pet/capability-inventory.md`; the selected decision supersedes this earlier variant. |
| `architecture-review-dom.html`, `architecture-review-dom-fixed.html`, `architecture-review-expanded-dom.html`, `architecture-review-complete-dom.html` | Removed from Temp | Intermediate rendering variants of the October 2 Build review. Preserve the dated canonical report. |

## Questions that need product or architecture decisions

These are the remaining questions that can block a contract choice. The Build portal access package and Companion ADR already settle the owner direction; they now need verification, not another product decision.

1. **Help Centre authority:** Is Help Centre content a Knowledge Base projection or an independently governed product surface? Decide ownership, publishing and access before deleting either path. Source: September 26 Knowledge Base review, candidate 9.
2. **Documents identity:** Which distinct entities should replace or qualify the overloaded document table, and what migration compatibility period is acceptable? Source: September 26 Documents review, candidates 1–4. Preserve existing user-visible IDs and ACLs during migration.

## Verification and closure rule

For each checkbox, capture current commit, exact affected paths, existing PRD/task links, failure reproduction, corrected contract, focused tests and relevant browser/database/role evidence. A source review or passing unit test alone does not prove a deployed journey or authorization boundary. Do not remove implementation or mark a candidate complete based solely on these HTML reports.
