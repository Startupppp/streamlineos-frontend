# 20c — Two "closed" clauses of the projection box were open, and the box's own gate never ran

**Ticket:** 20, box 1 (line 32). **Verdict: the box stays OPEN and BLOCKED** on the same product
decision. Nothing here changes that. What changed is that **two clauses recorded as CLOSED were not**,
and the gate that covers the box **could never execute in CI**.

## Summary

| Finding | Before | After | Enforced at |
|---|---|---|---|
| Existence paths hydrating a whole row | 54 (unmeasured) | 0 in scope | allowance 0 |
| — deferred to crm/leads/deals/contacts/inventory | — | 7 | ratchet 7 |
| Full-row reads of a vector/tsvector/bytea table | 5 (recorded as 0) | 0 | allowance 0 |
| `check:query-projections` runs in CI | never | yes | `check:gate-wiring` |
| `ci.yml` parses as YAML | no | yes | `check:gate-wiring` |
| Unprojected-read population ratchet | 1,441 | 1,383 | total |

## 1. The existence clause was never covered by anything

The ticket records the existence clause as closed: *"The three clauses that need no such decision —
count paths, existence paths, and global-`users`/vector hydration — are **closed**."* That is false for
existence, and the gate's own output line said so without anyone noticing — it printed
`Unprojected COUNT/EXISTENCE paths` while `resultIsOnlyCounted` returns true **only when every use is
`.length`**. An existence check is `if (!row) throw`, which is not a `.length`. The clause had no
detector.

The previous pass documented why it stopped at counts: allowing a bare use as a truthiness test
*"measured 211 findings against the hand-scan's 4, because `return rows;` is a bare use too"*. That is a
true property of **a regex**, not of the clause. A syntax tree separates the two exactly:

```
const row = await db.query.signRecipients.findFirst({ where: w });
if (!row) throw new BadRequestException("nope");     // finding
...
return row;                                          // NOT a finding — parent is a ReturnStatement
```

Measured with an AST over 3,586 non-spec files: **54 sites**, **827 columns** hydrated to answer a
yes/no question, **25 of them on a table carrying jsonb or a credential**.

The worst is the same shape the earlier pass celebrated catching in `survey_participants`:

- `e-sign/sign-fields.service.ts:56` — `signRecipients`, **34 columns**, to decide whether a recipient
  belongs to an envelope. The emitted SQL names `access_code_hash`, `otp_code_hash` and
  `signing_token_hash`.
- `notifications/notification-providers.service.ts:86` — `config_encrypted`.
- `organization/core/organization-settings.service.ts:73,77` — `organizations`, **38 columns**, 3 jsonb,
  twice, to check whether a slug is taken.
- `organization/core/organization-settings.service.ts:341,363` — `org_custom_domains.verification_token`.
- `org-hierarchy-*.service.ts` × 15 — `org_units`, 17 columns including a `metadata` jsonb.

47 fixed (`columns: { id: true }`, or `{ userId: true }` where that is the PK). 7 left in
crm/leads/deals/contacts/inventory, which are out of release scope.

**Why this needs no product decision:** an existence check has no response DTO. The value is never
returned, read or passed — that is what makes it a finding — so the wire shape cannot change.

### The safety net was bite-proved, not assumed

The brief warns that Drizzle's `with:` is not type-checked, so a projection can look minimal in the type
and hydrate a full relation at runtime. **That warning does not extend to a top-level `columns:`**, and
the difference is load-bearing here. Proved in a `git archive HEAD` tree — never in the shared working
tree — by planting a read of an excluded column after a shipped narrowing:

```
src/modules/e-sign/sign-fields.service.ts(61,46): error TS2339:
  Property 'signingTokenHash' does not exist on type '{ id: number; }'.
```

So `tsc --noEmit` **exit 0 with a genuinely empty log** over the 48 narrowings is evidence that none of
them dropped a column that is read, rather than hope.

### Verified on emitted SQL, not on the type

Per the brief's instruction to check what is actually emitted, the queries were built against the real
schema and `.toSQL()` read:

| Read | Before | After |
|---|---|---|
| `sign_recipients` existence check | **34** columns | **1** |
| `organizations` slug check | **38** columns | **1** |
| `org_units` conflict check | **17** columns | **1** |

## 2. The vector clause was recorded at zero and was five

The box also forbids hydrating a large JSON/blob/**vector** field. The ticket records
*"**0** reads hydrate an `embedding`/`fts` column on a list path"*. That was measured over **relations**
and over `db.query` only, so five **base-table** reads were invisible — four of which ship the tsvector
to the caller:

- `support/core/support-kb.service.ts:190` — `getArticle` spreads the whole `kb_articles` row,
  `fts` included, into its response.
- `kb/wiki/kb-page-duplicate.service.ts:116,142` and `kb/wiki/kb-page-tree.service.ts:210` — bare
  `.select()` from `kb_pages`.

`kb-page-duplicate.duplicate` declares `Promise<KbPageRow>`, which is `Omit<…, "fts">`, and returned the
tsvector anyway: **a wider object is assignable to a narrower one, so `tsc` was silent.** The code
violated its own declared contract at runtime while typechecking clean.

**Why this needs no product decision:** both modules already own the fix and state the rule.
`kb-page-columns.ts` and `kb-article-columns.ts` exist precisely for this — *"PRD §5.1 forbids hydrating
a vector into a response"* and *"the frontend has zero references to the field"*. Confirmed
independently: **0** `fts` references in the frontend, and no backend reader outside the `kb_pages`
search predicate. Fixed with the module's own constants. Emitted SQL: `fts` present before, absent after.

## 3. The box's own gate could never run, and the gate that guards that said "all wired"

`check:query-projections` was in `package.json`, in **no** workflow `run:` step, and in **no** exception
list — yet `check:gate-wiring` reported *"96 gates, all wired"*. It decides "wired" with
`workflows.includes(g)` over the concatenated raw YAML, **comments included**, and `ci.yml:686` names the
gate inside a comment describing a *different* gate. Exactly one gate in the repository was passing on
that alone, and it was this box's.

Worse: **`ci.yml` did not parse as YAML at all**, and had not since the relation-hydration step landed.

```
- name: A with: block does not ship a whole related row
```

A plain YAML scalar may not contain `": "`. The file was invalid, so **every gate in it was dead**, not
just this one. One line, one file; quoting fixes it. Verified: before, `BLOCK_AS_IMPLICIT_KEY` at line
701; after, the document parses to **5 jobs / 123 steps** with both ticket-20 gates present as real
`run:` steps.

Both holes are now closed at the matcher, so the next accurate comment about a gate cannot silently
re-open the first, and the next unquoted colon cannot re-open the second.

## 4. What is enforced now

`pnpm check:query-projections` — **exit 0**, self-test **26/26**:

```
Scanned 3587 source files.
Unprojected reads — findMany 287 · findFirst 492 · bare .select() 604 = 1383 (ceiling 1383)
Unprojected COUNT paths (.length only): 0 (allowed 0)
Unprojected EXISTENCE/COUNT paths, AST: 0 in scope (allowed 0) · 7 deferred to crm/inventory (ratchet 7)
Full-row reads of a vector/tsvector/bytea table: 0 (allowed 0) over 5 such tables
```

The heavy-column tables are resolved **from the schema**, not from a hand-written list, so a new
embedding column is covered the day it lands. Anti-vacuity: the run fails if it resolves 0 such tables.

Bite-proved hermetically (`git archive HEAD`, defect planted there, never in the shared tree):

| # | Case | Result |
|---|---|---|
| 1 | clean archive | rc 0, 0 findings |
| 2 | revert one shipped existence projection | rc 1, names `sign-fields.service.ts:56` |
| 3 | restore it | rc 0 |
| 4 | plant a new existence path | rc 1, names it |
| 5 | **same guard but the row is RETURNED** | **0 existence findings** — the distinction the regex cannot draw |
| 6 | plant one in excluded inventory | rc 1 on the deferred ratchet |
| 7 | remove it | rc 0 |

Case 5 is the one that matters: it is the false-positive class that drove the previous pass to abandon
the clause, and the AST rule is silent on it. (Its rc is 1 only because a new file also raises the
separate *population* ratchet — the existence rule reported 0.)

## 5. Why the box still cannot be ticked

The remaining clause is *full ORM rows on ordinary list paths* — **1,383** unprojected reads. Narrowing
the bulk of them changes a response DTO (`formSchemaSnapshot` is what `maskSensitiveData` reads; the
audit jsonb **is** the diff the UI renders). That is a product/API-contract decision and no measurement
closes it. It stays **R-5, ACCEPTED RESIDUAL**.

What this pass changes is the confidence in the *other* clauses. Twice now a clause recorded as closed
has turned out to be open the moment it was measured from a new angle, and both times the residue
included a credential or a vector on the wire. The lesson is not "measure more" — it is that **a clause
is only as closed as the detector that watches it**, and the ticket had been scoring three clauses with a
detector that covered one.

## Cross-territory findings (not fixed here)

- **`96674525 perf(sessions): write revocation tombstones one chunk at a time` regressed
  `test/security/appsec/session-revocation-enforced.spec.ts`** — 7 of 13 tests. Bisected: the spec passes
  at `be3eb03e` (13/13) and fails at `96674525`. It asserts on the source text of the redis tombstone
  writer, which that commit rewrote. Not a projection issue; routed to the sessions lane.
- **`check-gate-wiring`'s substring matcher is a general false-green mechanism.** Fixed for comments and
  for unparseable step names, but it still decides "wired" by substring over concatenated YAML — a gate
  named in a `#`-free string anywhere (an `env:` value, an unrelated `run:`) would still count. A real
  parse would be stronger; no YAML parser is a declared dependency (`yaml` is present only transitively,
  and a gate guarding CI should not rest on a transitive hoist). Routed as **GATE-WIRING-SUBSTRING**.
- **REL-DUP** (from the previous pass) is unchanged: `users`, `jobPostings` and `scorecardTemplates`
  carry two `relations()` blocks each, and only one reaches the inferred type.

## Commands run

| Command | Exit | Result |
|---|---|---|
| `tsc --noEmit` (8 GB heap, after the 48 narrowings) | **0** | log genuinely empty (0 lines) |
| `tsc --noEmit` (after the vector fixes) | **0** | log genuinely empty (0 lines) |
| `tsc --noEmit` in `git archive HEAD` + planted excluded-column read | **2** | `TS2339` — the net bites |
| `jest --runInBand` over 93 specs covering the changed services | 1 | 92 passed / 1 failed; the failure bisected to another lane's `96674525` |
| `jest --runInBand --testPathPattern="modules/(kb\|support)/"` | **0** | 139 suites / 993 tests |
| `check:query-projections` | **0** | 1383/1383; count 0, existence 0, vector 0 |
| `check:query-projections:self-test` | **0** | 26/26 |
| `check:relation-hydration` | **0** | 186/186; credential candidates 77 → **72** |
| `check:gate-wiring` | **0** | 96 gates, all wired |
| `ci.yml` YAML parse | **0** | 5 jobs / 123 steps (was `BLOCK_AS_IMPLICIT_KEY`) |

## Commits (backend)

| SHA | What |
|---|---|
| `be3eb03e` | 48 existence/count narrowings, 34 files |
| `be77e74d` | existence gate + ci.yml parse fix + gate-wiring comment blindness, 5 files |
| `ec32af7b` | 5 tsvector hydrations, 4 files |
| `b8d87958` | vector clause gate rule, 3 files |
