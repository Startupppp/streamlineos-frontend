# 02 — Competitive Research: DELIBERATELY SKIPPED

**Date:** 2026-07-31 · **Scope:** Build module only · **Status:** closed as a decision, not an omission

---

## The decision

Phase 2 of the refactor brief asked for a competitive study — how Linear/Asana/ClickUp model projects,
HubSpot/Attio model clients, Upwork/Contra/Bonsai model freelance work, Stripe/Medusa model products,
WorkOS/Clerk model org+RBAC — producing a feature matrix and 15–25 adoptable patterns.

**This phase was never run, and is now closed rather than back-filled.**

## Why

1. **Scope was narrowed to Build only.** Four of the five competitor sets in the brief map to domains
   explicitly ruled out of this refactor: clients/CRM, freelance engagements, products/commerce, and
   org+RBAC. Researching them would produce findings this program is not allowed to act on.

2. **The remaining defects are not feature gaps.** Everything Phase 1 and the execution batches
   surfaced — a lying migration journal, automations that never fire, int4 PK exhaustion, unprojected
   list reads, missing tenant columns, 18 files over the size cap — is *correctness, capacity and
   hygiene* work. A feature matrix does not inform any of it.

3. **A feature matrix now would generate scope, not close it.** The one genuine capability gap found in
   this module was found by comparing the **backend to its own frontend** — Programs had 7 endpoints,
   2 catalogued permissions and 2 tables with zero UI. That is the kind of evidence that justifies
   building something. "ClickUp has X" is not, and acting on it would expand a refactor into a product
   roadmap without the user asking.

4. **The design questions Phase 2 would have answered were already decided.**
   `docs/schema-redesign/north-star.md` is a settled target that this program converges on rather than
   re-derives — including the explicit rejection of a merged products table and the documented
   deliberately-kept bounded value lists.

## What replaced it

The adoptable-patterns role was served by the repo's own established patterns, which §29.4 of
`CLAUDE.md` ranks above ambiguous external guidance. Two concrete cases:

- **Validation** — the NestJS docs demonstrate `class-validator`. The repo has 2,177 `ZodValidationPipe`
  sites and neither `class-validator` nor `class-transformer` installed. The *principle* (validate
  globally at the boundary, one schema per payload, strict unknown-key handling) was adopted; the
  library was not.
- **Module-specific automation actions** — rather than inventing a shape, the existing `support_*`
  action executors in the generic engine set the precedent that was followed.

## If this is ever wanted

It should be commissioned as its own piece of work with its own scope, covering the whole platform
rather than one module, and feeding a product roadmap rather than a refactor change map. Folding it
into a correctness pass would compromise both.
