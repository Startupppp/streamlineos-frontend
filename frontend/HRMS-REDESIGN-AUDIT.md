# HRMS redesign audit — working file

Claude Code fills this in. Nothing below is pre-judged: every verdict cell is
empty until a screen has actually been opened and measured.

**Scope:** `app/(authenticated)/hr/**` — 127 pages, 606 components under
`features/hr/**`, 245 files rendering `<Button>`, 73 rendering `DataTable`.

**Skills to load before starting:** `ui-ux-pro-max` (styles, palettes,
responsive rules), `frontend-design` (visual direction), `taste-skill`
(brand/redesign passes). Load them for *judgement*, not for rules — §0 says
which authority wins when they disagree with this repo.

---

## §0. Which authority wins — read this first

The design skills give generic web advice. This repo has its own contract, and
where they disagree **the repo wins inside the authenticated app**. Getting
this backwards is how a redesign turns 606 components into lint failures.

| Generic skill says | This repo says | Winner inside `(authenticated)` |
|---|---|---|
| 44×44px minimum touch target | `h-9` (36px) via `FIELD_CONTROL_CLASS` | **Repo.** Desk software, pointer-first |
| 16px minimum body text on mobile | `text-sm` (14px) via `FIELD_CONTROL_CLASS` | **Repo.** FE-102 |
| Use raw Tailwind sizes freely | `no-raw-visual-values` is an eslint **error** | **Repo.** `text-[11px]` fails the build |
| Pick a palette | Tokens already defined in `globals.css` | **Repo.** Redesign re-uses tokens, never hardcodes hex |

**The 44px rule is not wrong — it is scoped.** It already exists, correctly, at
`globals.css:1926` under `.candidate-surface`, applied to the five
candidate-facing roots (careers, apply, application-status, offer,
interview-booking) where a phone is the primary device. That media query is
deliberate and its comment explains why it is a media query and not a per-control
class. **Do not extend `.candidate-surface` into the authenticated app**, and do
not "fix" `h-9` to `h-11` anywhere under `app/(authenticated)/`.

If a specific HR screen genuinely needs phone-sized targets (field staff on a
handset — attendance punch, shift swap), that is a **new scoped class beside**
`.candidate-surface`, proposed in §6 with the screen named, never a global change.

### Files that define the contract

| Thing | Path |
|---|---|
| Control sizing | `components/ui/field-control.ts` → `FIELD_CONTROL_CLASS` |
| Tokens + scoped mobile rule | `globals.css` (`.candidate-surface` at ~1926) |
| Token lint rule | `eslint.config.mjs` → `eslint-rules/no-raw-visual-values.mjs` |
| Loading / error / empty | `components/shared/page-state.tsx` → `<PageState>` |
| Permission gating | `hooks/api/access.ts` → `useCanState`, `useCan` |
| The one table | `components/ui/data-table.tsx` |

Rules cited by ID (FE-40/41 PageState, FE-43 `useCanState`, FE-44 `useCan`,
FE-92 tokens, FE-102 control sizing, FE-104 one DataTable) live in
`frontend/CLAUDE.md`. **Read the rule before citing it** — restating it from
memory is how a stale rule spreads.

---

## §1. How to run this — batches, not one pass

127 pages will not survive a single sweep; findings from page 9 get forgotten by
page 90. Work one **domain** at a time, finish its table, commit, then move on.

Suggested order — highest traffic first:

1. `workforce` · `employees` · `org`
2. `attendance` · `leaves` · `holidays` · `rosters` · `shifts`
3. `recruitment` (already reworked — audit for regression only)
4. `expenses` · `reimbursements` · `fnf` · `workforce-cost`
5. `performance` · `goals` · `kpis` · `feedback`
6. `onboarding` · `termination` · `exit` · `document-review`
7. everything else

Per batch: fill §3–§5, run §7 gates, commit `ui(hr/<domain>): …`. Do not start
the next batch on a red gate.

---

## §2. Evidence rule

A verdict with no evidence is an opinion. Every row needs one of:

- a viewport screenshot at the width in question, or
- the measured value (`getComputedStyle`, a11y tree, or the class string), or
- the failing gate output

"Looks fine" is not a finding. **A screen not opened is recorded as
`NOT AUDITED`, never as a pass.** If no browser was available for a batch, say
so here in one line rather than leaving the column blank:

> Browser not available for batch __; rows marked NOT AUDITED are unmeasured.

---

## §3. Button necessity ledger

The question is not "is this button styled right" but **"should this button
exist"**. 245 files render buttons; most screens accumulated theirs one ticket
at a time and nobody ever removed one.

### Decision rubric — apply in order

| Test | If it fails |
|---|---|
| **1. Reachable?** Does the handler run, and is the route/mutation live? | **DELETE.** A button calling a dead endpoint is worse than no button |
| **2. Permitted?** Is it gated on the exact backend key via `useCan`? | **GATE** (FE-44/45). An ungated control that 403s teaches users the app is broken |
| **3. Denial ≠ empty?** When denied, does the screen say *denied*, not *"No records"*? | **FIX** (FE-47). Denial rendered as emptiness is a lie about the data |
| **4. Distinct?** Does another control on this screen already do it? | **MERGE.** Two paths to one mutation = two places to fix a bug |
| **5. Primary?** Is it the main action, or a secondary/destructive one? | **RE-RANK.** One primary per screen. Destructive is never primary |
| **6. Labelled?** Icon-only with `aria-label`? Verb-first text? | **FIX.** Icon-only with no label is invisible to a screen reader |
| **7. Async-safe?** Disabled + busy state while the mutation is in flight? | **FIX.** Double-submit on a payroll mutation is a real incident |
| **8. Idempotent?** Mutating control using `useIdempotentMutation`? | **FIX.** The api-client mints a key per fetch — no replay protection |

### Ledger — one row per button

| Screen (route) | Button label | Keep / Merge / Delete | Failed test # | Permission key | Evidence |
|---|---|---|---|---|---|
| | | | | | |

**Deletions need a second line of justification.** Record who loses the
capability and where it moves to. A control removed from a screen someone
depends on is a regression wearing a cleanup's clothes.

---

## §4. Style & token ledger

Everything visual resolves to a token. No hex, no arbitrary Tailwind values —
`no-raw-visual-values` is an **error**, so a violation fails the build, not the
review.

| Check | Pass condition |
|---|---|
| Color | Token only. No `#`, no `rgb(`, no `text-[#...]` |
| Spacing | Scale only. No `p-[13px]` |
| Type | `text-sm` / token scale. No `text-[11px]` |
| Controls | `FIELD_CONTROL_CLASS`, not a hand-rolled `h-9 rounded-md …` copy |
| Dark mode | Every surface readable in both. Borders visible in both |
| Contrast | ≥ 4.5:1 body, ≥ 3:1 large. **Measured**, not eyeballed |
| Icons | One set, SVG. **No emoji as icons** |
| Focus | Visible ring on every interactive element, keyboard-reachable |
| Motion | 150–300ms, `transform`/`opacity` only, `prefers-reduced-motion` honoured |
| Table | Exactly one `DataTable` per screen (FE-104) |

| Screen | Violation | Token/class it should use | Fixed? | Evidence |
|---|---|---|---|---|
| | | | | |

---

## §5. Responsiveness matrix

Four widths. Record the *observed* failure, not "responsive: yes".

| Width | Device | What must hold |
|---|---|---|
| 375 | phone | No horizontal scroll. Nothing clipped. Tables collapse or scroll **inside** their own container |
| 768 | tablet | Two-column layouts reflow without overlap |
| 1024 | laptop | Sidebar + content coexist; no content under a fixed bar |
| 1440 | desktop | Consistent `max-w-*`; content not stranded in a 2000px line |

Per screen, check: horizontal scroll · clipped/overlapping text · content hidden
behind sticky headers · modal/sheet fits and scrolls · table reachable ·
form submittable without zoom.

| Screen | 375 | 768 | 1024 | 1440 | Worst failure | Evidence |
|---|---|---|---|---|---|---|
| | | | | | | |

**Tables are the known risk.** 73 files render `DataTable`; a wide HR table at
375px is the most likely source of page-level horizontal scroll. The fix is a
scroll container or a stacked card layout — **never** shrinking type below the
token scale, which fails §4 and lint.

---

## §6. Proposed scoped exceptions

Anything that cannot be done inside §0 goes here as a proposal, not a commit.

| Screen | Why the standard rule fails it | Proposed scope | Blast radius |
|---|---|---|---|
| | | | |

A proposal naming "all of HR" is not scoped. Name the routes.

---

## §7. Gates — run before claiming a batch done

This repo is `pnpm@10.18.0` — there is no `package-lock.json`, so `npm install`
here corrupts the tree.

```bash
cd streamlineos-frontend/frontend
pnpm lint                       # no-raw-visual-values is an ERROR
pnpm type-check
pnpm type-check:specs           # specs are excluded from tsconfig.json
npx jest --silent -w 2 --testPathPattern "hr"     # singular: --testPathPatterns is rejected
```

Cap the workers. A bare `jest` here makes the laptop unusable.

**Attribution, before blaming your change:** measure the same command on a
clean `origin/main` worktree. Gates in this repo are wrong more often than the
code is.

```bash
git worktree add --detach /tmp/main-check origin/main
ln -s "$(pwd)/node_modules" /tmp/main-check/frontend/node_modules
cd /tmp/main-check/frontend && <failing command>
rm -f /tmp/main-check/frontend/node_modules
git worktree remove --force /tmp/main-check
```

Remove the symlink **before** removing the worktree, or the real `node_modules`
goes with it. Never run an install in a worktree — they are shared.

**Known already-red on `origin/main`** (not yours, do not "fix"):
`lib/rbac/denial-is-not-emptiness` — 5 unlisted surfaces, 7 stale wiki entries.
Two of the 5 are HR (`features/hr/analytics/analytics-page-client.tsx`,
`features/hr/rosters/assign-roster-entry-sheet.tsx`) and one is
`components/hr/department-combobox.tsx`. **Those three are legitimately in
scope for this audit** — fixing them means *removing* their ledger entries, and
the ledger may only shrink (FE-48). Never widen it to go green.

---

## §8. Batch sign-off

| Batch | Screens | Buttons kept/merged/deleted | Style fixes | Responsive fixes | Gates | Not audited |
|---|---|---|---|---|---|---|
| | | | | | | |

State what was **not** done. A redesign reported as complete over screens nobody
opened is the failure this file exists to prevent.
