# Token migration — running list

The migrate half of the wide refactor (ticket 17). Legacy values still exist, so
the build stays green between batches; ticket 18 deletes them once nothing
references them.

**Do not attempt this as one change.** Each batch below is its own unit of work
with its own commit, and the build is green after every one.

## Method

Two kinds of value, and they are not equally safe to move.

**Type is mechanical.** The tokens are defined as exactly 10, 11 and 13px and
Tailwind's own scale is exactly 12, 14 and 16px, so those replacements render
byte-identically and were done platform-wide in one batch.

**Colour is not.** Each legacy usage is a light class plus a hand-written `dark:`
twin — six classes where three tokens do the job, and roughly half the call
sites in this codebase forgot the twin, so migrating also fixes dark mode where
it was silently broken. But which *role* a colour plays is a judgement: a hue
maps to a status tone only when it means that status. The codemod handles the
unambiguous mapping and everything else is raised below rather than guessed.

```
emerald · green · teal · lime     -> status-success
amber · yellow · orange           -> status-warning
red · rose                        -> status-danger
blue · sky · indigo · cyan        -> status-info
slate · gray · zinc · neutral     -> muted-foreground / muted / border
```

Greys map to the shadcn semantics rather than to `status-neutral`: they already
exist, they already handle both themes, and most grey in this codebase means
"secondary text" rather than "neutral status".

## Batches

| # | Batch | Values | Status |
|---|---|---|---|
| 1 | Type scale, platform-wide | 4,074 | **done** — 2026-08-25 |
| 2 | Settings | 291 → 0 | **done** — 2026-08-25 |
| 3 | CRM | 953 → 79 | **done** — 2026-08-25 |
| 4 | HR | 3,164 → 0 | **done** — 2026-08-25 |
| 5 | Build | 1,033 → 0 | **done** — 2026-08-25 |
| 6 | Payroll | 856 → 0 | **done** — 2026-08-25 |
| 7 | Route shells `app/(authenticated)` | 2,001 → 0 | **done** — 2026-08-25 |
| 8 | Inventory · Accounting · Timesheets | 1,133 → 0 | **done** — 2026-08-25 |
| 9 | Everything else (58 modules) | ~2,300 → 0 | **done** — 2026-08-25 |

Ordered by how much users touch them, after Settings — which goes first because
it is the most-complained-about surface and is mostly forms, so it exercises the
control tokens hardest with the least layout risk.

**Every batch is done.** `no-raw-visual-values` reports **zero errors** across
`features`, `components`, `app`, `hooks` and `lib`.

471 palette values remain and all of them are one of two things the token set
cannot express — see below. Nothing that a token *can* express is hardcoded
anywhere.

## The rule that stops it coming back

`eslint-rules/no-raw-visual-values.mjs` fails the build on a palette class, an
arbitrary type size or a raw colour literal. Migrating every module is worth
little if the next feature adds `text-emerald-600 dark:text-emerald-300` back —
and it will, because that is what every example on the internet shows.

**Scoped to what has actually been migrated**, and widened as batches land. A
rule that fires eleven thousand times is a rule somebody disables. Currently
held: `features/settings`, `features/renderer`, `features/crm/autonomy`,
`features/crm/import`, `lib/design-tokens`.

Verified to fail: reintroducing `text-emerald-600 dark:text-emerald-300
text-[11px]` into a held file is an error, not a warning.

## Raised, not fixed inline

Criterion 7: where a module needs a value the token set lacks, it is an addition
to decide on rather than something to paper over.

### The categorical palette is real after all

`features/crm/shared/metadata/crm-color-tokens.ts` holds **twelve tenant-chosen
hues** for pipeline stages, tags and metadata. "Blue" there means the colour a
person picked, not "information".

The codemod flattened it before this was noticed — every hue collapsed into four
status meanings, so one tenant's stage would have rendered as a notice and
another's as a warning. Worse, `dotClass: "bg-blue-500"` (a solid dot) became
`bg-status-info-surface`, a pale wash that renders an invisible dot. **Reverted**,
and the file is now excluded from the migration with a comment saying why.

**Needed:** a categorical scale — twelve hues with the same light/dark guarantee
the status tones have, plus a solid `fill` role alongside `surface`/`ink`/`rule`.
Until then this file is the one place raw palette values are correct rather than
a lapse.

## `fill` — added

The gap the migration itself proved. 306 values were solid fills — a button, a
status dot, a progress bar — and a surface is a pale wash, so treating them as
one role is what puts white button text on a near-white background. The status
tones now carry `fill` and `fill-hover`, matching the categorical scale.

`fill-hover` is a separate token rather than an opacity change, because a hover
derived by transparency washes out against a dark ground.

All 306 are migrated. `no-raw-visual-values` now flags fills too.

## What is deliberately left, and why

**111 values, and the rule is silent on all of them by design.** A rule that
demands the impossible is a rule somebody disables.

### Gradients — 102

`from-`/`to-`/`via-` pairs: funnel charts, hero washes, brand panels, chat
bubbles. There is no role and it is not obvious there should be one — a gradient
is closer to an illustration than to a decision, and inventing
`--gradient-1-from` would put a decorative choice into the system every product
screen reads from.

### Arbitrary-alpha washes — 9

`bg-sky-300/[0.12]` on a blurred, `pointer-events-none`, `-z-10` ambient blob.
A hand-tuned opacity on a decorative shape is not a semantic surface, and the
rule excludes the arbitrary-alpha form specifically rather than the file.

### Display type — 32

Marketing and brand headings between the product steps: a hero at 2.75rem, a
pricing headline at 1.35rem. Sizes meant to be looked at rather than read in a
table. Colour is still enforced on those surfaces; only the type check is
relaxed, which is why they are listed by path rather than the rule being
weakened.

**Ticket 18 can now delete the legacy path for colour and type.** What it cannot
delete is whatever a gradient needs, because nothing has replaced it.

### Solid fills are not surfaces

The same pass turned `bg-emerald-600 text-white` — a button — into
`bg-status-success-surface text-white`, which is white text on a near-white
wash. A surface is a light tint (50/100) or any shade carrying an alpha, which
is how the dark twins are written; a solid mid shade with no alpha is a fill,
and the token set has no fill role.

The codemod now leaves solid fills alone. 79 remain in CRM and they are all
buttons and dots waiting on that role.

Two smaller codemod fixes came from the same batch: variant prefixes
(`hover:bg-amber-50`) were never matched at all, and a variant resolving to its
own base (`bg-X hover:bg-X`) is a hover that changes nothing, so the original is
kept rather than flattened.

### Resolved while migrating Settings

Two things looked like missing tokens and were not.

**A stray hue, not a category.** `audit-log-constants.ts` had one entry in
fuchsia where its siblings — `org.branch`, `org.department` — were `info`. It
read as a category needing its own scale; it was an inconsistency. `org.team`
now matches the structural changes it sits beside. There is no categorical
palette and, on this evidence, no need for one yet.

**Type below the floor.** 9px is below every legibility guideline, and adding a
`--text-tiny: 9px` would launder an accessibility problem into something that
looks sanctioned. The 14 occurrences in migrated modules were **raised to
`text-micro`** (10px) instead, which is exactly the "type becoming consistent"
the batch is allowed to change.

**One real defect found.** The renderer rendered email, phone and URL values as
`text-blue-600` with no `dark:` twin at all — dark blue links on a dark
background. They now use `text-primary`, which is redefined under `.dark`.

### Still raised, across the unmigrated modules

| Size | Count | Verdict |
|---|---|---|
| 9px | 284 | **Too small.** Raise to `text-micro` as each batch reaches it. |
| 8px, 7px, 6px | 57 | Too small. Same treatment. |
| 15px, 17px, 28px | 26 | One-offs between existing steps; decide per case. |

## The categorical scale, added

Raised as missing, then added, because the need turned out to be everywhere:
sidebar products, notification types, e-sign recipients, expense classes,
interview types, KPI categories, lead kinds, HR calendar entries and a tenant's
own pipeline stages. Twelve places colouring a *taxonomy*, all of which would
have read as random statuses on the status scale.

Eight hues × four roles in `globals.css`, with `categoryClasses()` and
`categoryBadgeClass()` in `lib/design-tokens`. It carries the `fill` role the
status tones lack, because a category dot is a solid colour.

### Widened to sixteen, because eight only half-fixed it

The first eight were the hues with **no** status equivalent — violet, pink,
fuchsia and friends — and only the solid `fill` role was moved over. Every hue
that happened to land on a status (blue, sky, cyan, indigo, emerald, green,
teal, lime, amber, orange, yellow, red, rose) stayed on the status token, inside
the same lookup table. The result was 291 lines across 57 files where an entry's
dot was correctly distinct and its badge, background, border and text were
byte-identical to its neighbour's: a warehouse tree with four kinds of location
on one blue chip, a sidebar with four products on one blue panel, an e-sign
envelope where recipients 1 and 6 differed only in the swatch.

Eight more hues — `sky`, `teal`, `green`, `orange`, `indigo`, `fuchsia`, `lime`,
`red` — in both themes and all four roles, built exactly like the first eight.
Sixteen covers every taxonomy except notification categories, which has 18; the
two that double up there are written down at the call site as a named grouping
(billing with payroll, workflow with sign) rather than left to look like an
accident.

The rule for an entry is now one line: **all four roles read the same hue.** An
entry that mixes `bg-category-X-fill` with `bg-status-Y-surface` is the defect,
not a style.

## What is not verified

Criteria 5 and 6 ask for responsive behaviour at three widths and both themes,
verified **per batch**. That has not been done for batches 1 and 2. Both are
argued rather than observed:

- Batch 1 changes no rendered size, so it cannot change layout or reflow.
- Batch 2 replaces literal colours with custom properties that resolve per
  theme, and removes `dark:` twins that are now redundant — which strictly
  improves dark mode, because the twins that were missing are now covered.

Neither argument substitutes for looking, and that goes for every batch since:
none of the nine has been checked at 375, 768 and 1280px in light, dark and
system default. The changes are colour and type only — no spacing, no layout, no
density — so reflow is not mechanically possible, and the dark theme should be
strictly better because every migrated value now resolves per theme where
roughly half previously had no `dark:` twin at all.

That is an argument, not an observation. **The verification criteria stay
unticked.**
