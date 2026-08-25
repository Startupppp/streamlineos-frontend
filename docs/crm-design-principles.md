# CRM design principles

**Status:** in force
**Date:** 2026-08-25
**Test each one against:** *could a competent designer argue the opposite and mean it?* If not, it is a slogan and belongs in the bin. The opposite of a principle should itself be a principle.

These were written after auditing the CRM surfaces rather than before, because a principle that does not resolve a decision the codebase actually faces is decoration. What the audit found is recorded under each one.

---

## 1. The app is dense. Only a lost user gets whitespace.

A sales manager on a 14-inch laptop sees **twenty-plus rows without scrolling**. Marketing-site air is banned inside the product. Whitespace is spent only where somebody does not yet know what they are looking at: first run, an error, an empty state, onboarding, settings explainers.

**The opposite is a real position:** "generous spacing reduces cognitive load and signals quality; cramped tables are why enterprise software feels hostile." Mercury and Stripe's marketing surfaces are built on exactly that, and they are not wrong for their user — a founder who opens the product once a day. Ours is an accounts manager inside it for eight hours, who pays for every row they cannot see with a scroll.

**How it is decided:** two density modes, `comfortable` and `compact`. There is no third. A surface picks one; it never mixes them. Tables, ledgers and pipelines are `compact`. Empty states, first-run and settings prose are `comfortable`.

**Audit:** `DENSITY_MODES` already declares exactly two, and there are **zero** arbitrary spacing values and **zero** arbitrary type sizes across `features/crm`. The scale is held. This principle is about not weakening it.

---

## 2. A blank container is a bug. Every empty state is one of four.

*First use* — nothing exists yet, teach what belongs here and offer the shortest way to create it.
*Filtered to zero* — data exists, the filter hid it; show the active filters and a way to clear them.
*Error* — say the load failed. **Never** dress a failure as emptiness.
*Done* — the queue is genuinely clear, and that is good news.

And a loading query is **none of these**. Showing "No records" while data is in flight teaches people the product lies to them, and that lesson does not un-learn.

**The opposite is a real position:** "four states per list is four times the surface for a screen most users see once; a single honest empty message plus a spinner is cheaper and users cope." That is a defensible trade in a consumer app with one list. It is indefensible in an ERP where a customer's first month *is* empty states — payroll, inventory and GST returns all start at zero.

**Audit — this is the weakest area in the product.** Thirty CRM surfaces have an empty state. **Twelve carry no loading signal at all**, so they can render "empty" while the query is still running. **One of thirty** distinguishes filtered-to-zero from first use. Four surfaces say some variant of "No data available", which tells a user nothing about which of the four situations they are in.

---

## 3. One golden path. Configuration is the last resort, not the first.

There is one way to import, one way to create a lead, one default pipeline. Power lives one click deeper, never spread across the first screen. When somebody asks to "make it configurable", the first attempt is always a **better default**.

A settings toggle is an argument the team refused to finish. It ships the decision to the customer, who is worse placed to make it and mostly never will — so the default is what everyone lives with anyway.

**The opposite is a real position:** "mid-market India buyers have genuinely different sales motions — eleven stages, their own approval matrix, their own GST treatments — and a rigid product loses the deal." That is true at the *structure* layer. The resolution is Linear's: be stubborn about the atom (what a lead is, how a table behaves, density) and flexible about structure (teams, territories, custom fields, approval chains). Custom fields must never enlarge the default create form.

**Audit:** there are **four** CSV import surfaces — `features/crm/import/` (a full page, the correct one) plus separate import dialogs for leads, contacts and deals. Four ways to do one job is the failure this principle names, and the fix is that a rewrite *absorbs* the old surface rather than standing beside it.

---

## 4. Multi-step work never happens in a modal.

A dialog is for **one decision the user already understands**: confirm, pick, rename. The moment work has steps, a back button, its own validation, or a state a user could lose by pressing Escape, it is a page or a sheet — something with a URL, a history entry, and no scroll trap.

**The opposite is a real position:** "a modal keeps context — the list stays visible behind it, and navigating away loses the user's place." Real, and it is why a *single-step* dialog is right. It stops being real the moment there are three steps and a file upload behind it.

**Audit:** three CSV import dialogs carry between thirteen and sixteen step references each — a multi-stage upload, map, preview, commit flow inside a `<Dialog>`. That is the anti-pattern exactly. The import *page* built for Phase 1 is the shape the other three should collapse into.

---

## 5. Mobile is five jobs, not a breakpoint.

The phone is not the desktop table at a narrower width. A field salesperson needs: today's follow-ups, call or WhatsApp a lead, log a note, move a stage, approve a quote. Everything else says *open on desktop* and means it.

**The opposite is a real position:** "responsive parity is what users expect; telling somebody their feature is desktop-only is a support ticket and a lost deal." That holds for a product whose mobile user is doing the same job smaller. Ours is doing a different job entirely — standing in a customer's warehouse, one-handed, on 4G.

**How it is decided:** a mobile surface is designed from the job list, not derived from the desktop component. A horizontally scrolling table on a phone is a failure, not a fallback.

---

## What this does not cover, deliberately

**Speed** is not a principle here because it is an acceptance criterion: if creating a lead, changing a stage, or searching takes long enough to notice, the feature is not finished. That belongs in the definition of done, not on a wall.

**"Follow fundamentals"** likewise. A pipeline is a kanban, a list is a spreadsheet, search is ⌘K. We do not invent a new table. Distinctiveness lives in GST-aware quoting, WhatsApp-native follow-up and India-density tables — not in a custom tab control. Nobody on this team argues otherwise, so it is a convention, not a principle.

## The contradiction we are choosing to live with

Principle 1 says dense; principle 2 spends space on empty states. That is not an inconsistency — it is the resolution. Density is for people who know what they are looking at. Space is for people who do not. The failure mode to watch is a surface that is *both*: a spacious table, or a cramped first-run screen.
