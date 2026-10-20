# StreamlineOS Calendar specifications

This directory intentionally contains only four canonical documents.

1. [Product PRD](./product-prd.md) — target users, competitor conclusions, feature tiers, product requirements, journeys, and success measures.
2. [Technical PRD](./technical-prd.md) — architecture, ownership, contracts, edge cases, security, and technical acceptance.
3. [Implementation PRD](./implementation-prd.md) — the single ordered task tracker for coding agents.
4. `README.md` — this index and working agreement.

## Working agreement

- Do not create per-feature ticket markdown in this directory.
- Add or refine work in `implementation-prd.md` using a consolidated `CAL-IMP-*` item.
- Keep product decisions in `product-prd.md` and implementation invariants in `technical-prd.md`.
- Mark a checkbox only after its full end-to-end acceptance and evidence are complete.
- Partial work remains unchecked with a `Blocked:` or `Evidence:` note.
- Never delete a requirement, code path, API, schema, migration, test, or persisted data unless it is verified complete and superseded, or Product explicitly classifies it as no longer needed.
- The deletion guard does not block required retention expiry, privacy erasure, legal-hold processing, security repair, or removal of proven undeployed/unreachable code after Product decision and dependency proof.
- Before deleting a superseded artifact, transfer every still-active requirement and regression constraint to its canonical owner and verify the one-to-one coverage map.
- Completed chronological logs belong in git history and deployment/CI systems, not new calendar markdown.
- Deferred capabilities remain indexed in the implementation PRD without active checkboxes. Technical PRD §12 preserves former-ticket/deployed contracts; Product-only deferrals receive a contract when promoted.

## Current scope

The active release focuses on:

- A simple Calendar / Agenda / My Day experience.
- Native scheduling and trustworthy recurrence.
- Unified CRM, Build, Tasks, HR, attendance, and connected calendars.
- Explainable Find a time with optional rooms/resources.
- Basic booking, invitations, reminders, rooms, and resources.
- CRM deal/lead scheduling.
- Permission-safe meeting outcomes and owner-reviewed source-date proposals.
- Provider reconciliation, accessibility, and release proof.

Capacity maps, coaching, what-if scenarios, protected work, Radar/chain, payments, workflow/developer UI, advanced analytics, polls, and advanced routing are not active Calendar UI work.

## Status authority

`implementation-prd.md` is the only implementation status authority and the only file with task checkboxes. Product and technical requirement IDs define outcomes and acceptance contracts without duplicating implementation status.

Checked `CAL-BASE-*` items are evidence-noted regression slices, not a claim that the release or overlapping `CAL-IMP-*` work is complete.
