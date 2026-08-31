# Binding protocol — every c28 session obeys this

Read this before your session brief and before any code. It overrides your habits, not the repository's
`CLAUDE.md` files — read those too (root, `backend/`, `frontend/`), and §12 resolves any conflict.

---

## 0. Do not stop until every ticket in your session is closed.

Your session owns a set of tickets. You are finished when **every one of them** is either closed with
evidence, or genuinely blocked with a written reason, the thing that would unblock it, and the exact
command that refused. Not before.

Concretely, you keep working through:

- **A finished ticket.** Closing one is not the end of the session. Move straight to the next unblocked
  ticket in your brief's suggested order. Do not stop to report and wait.
- **The urge to check in.** Do not ask "shall I continue?", "would you like me to proceed to ticket N?",
  or "should I keep going?". The answer is always yes. You already asked everything you needed at the
  start (§1); that was your one checkpoint.
- **A failing test or typecheck.** That is the work, not a reason to hand back. Fix it and continue.
- **A criterion you cannot satisfy.** Write down why, leave the box unticked, and move on to the rest of
  that ticket and then the next ticket. One blocked criterion does not block a session.
- **A long or repetitive task.** A 90-file migration batch is still one ticket. Finish it.
- **Context pressure.** The conversation summarises and continues; you do not need to wrap up early or
  hand off. Keep a running note in the ticket files themselves — they are your durable state, so a
  summarised context can resume from disk rather than from memory.

You stop early **only** for: a genuinely unsafe or destructive action needing confirmation, or a
discovery that invalidates the premise of the remaining tickets — and in that case you say so plainly,
having first finished everything that does not depend on it.

Before you write your final report, run this and make the number match your brief:

```bash
# from the repo root — how many of YOUR tickets still have unticked boxes
grep -c '^- \[ \]' architecture-refactor/c28-cell-based-platform-at-20m/issues/<each of yours>.md
```

Count the boxes **on disk**. A report that narrates ticks it never wrote is the failure mode this
program has already caught once — "README says done, issues say nothing" is the tell.

## 1. Ask everything at the start. Never mid-flight.

Before you write a single line, before you edit a single file:

1. Read your session brief, every ticket file it owns, and the PRD sections they cite.
2. Answer from the codebase everything the codebase can answer. **A question you could have answered
   with a grep is a wasted round trip.**
3. Then ask **every remaining question in one batch** (`AskUserQuestion`, max 4 per call, so at most two
   calls back to back). Your brief lists the decisions it already knows are genuinely open — those are a
   floor, not a ceiling. Add any you find.
4. Every option carries your recommendation, marked, with the trade-off in one clause.

After that batch you do not come back to ask. If something genuinely undiscoverable appears later:
**finish every piece of work that does not depend on it**, then state the assumption you took and flag it
in your final report. Stopping with nothing delivered is reserved for a decision that would be unsafe to
guess.

## 2. A checkbox is evidence. It is not intent.

A `- [ ]` becomes `- [x]` only when **all four** are true:

1. The change is written.
2. The verification command named in the criterion was run **in this session**.
3. Its **actual output** is pasted into the ticket beside the box.
4. That output shows a pass.

If it fails, you stay on it. You do not move to the next criterion, and you do not tick the box and note
that you will come back.

If a criterion **cannot be measured** — no data, no environment, no access log — the box stays `- [ ]`
and you write the reason, what would close it, and the exact command that refused. **A refusal to
measure is not a measurement.** This program has already un-ticked three boxes where a budget script's
refusal to run was offered as the measurement, and one that named a migration which had never been
applied.

Three things that look like progress and are not:

- **Editing a test so it passes.** A test failing because behaviour changed is the signal. Fix the code.
- **Editing a mock so a spec goes green.** A spec that only passes against a rewritten double proves
  nothing about the source.
- **Narrating a tick you never wrote.** Count the boxes on disk before you report. "README says done,
  issues say nothing" is the tell.

To prove a guard actually bites, neuter the *mechanism inside the test double*, never sabotage the source
file — a concurrent session will stage your sabotage.

## 3. Commands you may run

**Tests and lint are explicitly authorised for this program.** This overrides root `CLAUDE.md` §3, which
withholds them by default. The user has asked for tested work; untested work is not done work.

```bash
# Backend typecheck — OOMs without the heap flag
NODE_OPTIONS=--max-old-space-size=8192 pnpm -C backend exec tsc --noEmit

# Frontend typecheck — NOTE: tsconfig excludes tests, so this does not prove the tests compile
pnpm -C frontend exec tsc --noEmit

# Jest — from backend/. Never `npx jest`: it resolves to a global v30 and fails on
# the testPathPatterns rename and babel parse errors.
node ./node_modules/jest/bin/jest.js <pattern>

# e2e specs are in testPathIgnorePatterns and DO NOT run in the default suite
pnpm -C backend test:e2e

# If workers get killed, shard: 6 sequential runs, grep ^FAIL
node ./node_modules/jest/bin/jest.js --shard=1/6 --maxWorkers=2

# Builds — where a build is the only proof (tsc misses a missing side-effect import)
pnpm -C backend build
pnpm -C frontend build

# Deletion claims — knip AND a real build. Never grep alone.
pnpm exec knip --no-progress

# Migrations — only from backend/
pnpm -C backend db:generate | db:push | db:migrate

# Import graph — must stay at zero in both repos
pnpm exec madge --circular
```

Frontend eslint is a trap: a full run takes 25+ minutes and gets killed, a batch of 356 paths exits 1
with no report, and a `warn` rule never gates anything. Scope by the rule's selector and batch ≤60 paths.

## 4. Migrations

- **Journal it or it never applies.** A `.sql` file absent from `migrations/meta/_journal.json` is never
  executed and `db:migrate` reports success anyway. Drizzle skips by TIMESTAMP, not by hash.
- **`meta/_journal.json` is shared by all six sessions.** Append only. Never reorder. Re-read it
  immediately before writing, and commit it in the same commit as your `.sql`.
- `SET lock_timeout = '5s'` as the first statement, so it fails fast instead of queueing behind a reader
  and blocking the table.
- `VACUUM ANALYZE` after any rewrite. A rewrite kills the statistics **and** empties the visibility map —
  measured here as 53 → 201,875 blocks, and a COUNT that only `VACUUM` fixed.
- `generate --custom` **copies** the snapshot instead of diffing it, so the next `db:generate` re-proposes
  work you already applied. Check the snapshot after.
- Prove a migration landed with a `pg_catalog` diff, not with the runner's exit code. One migration here
  was recorded as applied with half its statements unrun.
- A migration's filename is not its table name. Grep `CREATE TABLE` inside it.

## 5. Git

You are the orchestrator for your session. You **may** `git commit` on the current branch. You **never**
push, checkout, branch, merge, pull, fetch, reset, stash or rebase.

**The index is shared with concurrent sessions.** Every commit is pathspec-scoped:

```bash
git add <your explicit paths>
git diff --cached --name-only | wc -l      # re-check: is this only your work?
git commit -m "..." -- <the same explicit paths>
```

Never `git add -A`, never `git add .`, never `--amend`. Both have swept another session's work into a
commit here already. Commit **after each ticket closes**, not once at the end — untracked files in this
tree have vanished mid-session before, and `git add` alone does not protect them.

Subagents run no git. Note that a `fork` inherits your commit role over its own instruction not to — if
you fork, tell it explicitly not to commit.

## 6. Territory

Edit only what your brief lists as yours. If your work needs a change in another session's territory:
**report it, do not make it.** Write it into your final report and append it to
[`CROSS-SESSION.md`](CROSS-SESSION.md).

`backend/src/db/schema/common/auth.ts` is the one file three sessions legitimately touch, each owning a
different `pgTable` block. Whoever touches it: re-read it immediately before editing, edit only your own
block, never reformat the file, and commit it straight away rather than holding it.

## 7. Verification discipline this program paid for

- **Verify by running the app.** Typecheck, build and 165 mocked tests have all been green here while
  nothing worked. Boot the API and exercise the real flow.
- **A `db.transaction` mock must invoke its callback.** A bare `jest.fn()` never runs the body, so every
  assertion inside it silently passes.
- **`import type` on an injected Nest service erases the DI token** — boot failure, or a silent `null`
  under `@Optional`. `tsc` and `madge` both stay green.
- **Measure as `streamline_app` with the tenant GUC**, never as the owner. The owner has `BYPASSRLS` and
  its query plans are not the ones production gets.
- **RLS is live.** A write with no tenant GUC dies `42501`. `this.db` is ALS-routed, so opening a
  transaction is not by itself enough.
- **Prepared statements are off** (`prepare: false` on Neon), so `sql.placeholder` advice is inert.
  Optimise with indexes, projection and N+1 removal.
- **Static analysis produces candidates, not conclusions.** Every CI check in this program under-reported
  on its first run. Test your scan against a defect you already know exists.
- **Grep the mechanism, not the string.** A literal message missed 13 of 21 handlers that branched on a
  `kind` tag.
- **A bare `import "./x";` is invisible to a from-based scanner** and has already cost a live file.
- **Emptiness is not deadness.** A table with zero rows is usually unseeded. If a scan says "everything
  is dead", the scan is broken.
- **Do not shrink scope to satisfy a rule.** An agent here deleted two user-visible options to make a
  rule pass. Removing capability is not compliance.
- **Do not invent scope for a false premise.** Told to hide a filter that did not exist, an agent built
  one and then hid it. Verify a premise before executing it.

## 8. Bookkeeping and the report

As each ticket closes: tick its boxes with evidence inline, set its `**Status:**` line, and update **only
your own rows** in [`../README.md`](../README.md).

Final report, in this order:

**Findings · Root cause · Solution · Files changed · Validation** (with the actual command output, not a
description of it) **· Left open and why · Cross-session requests.**

Report faithfully. If tests fail, say so and paste the output. If a step was skipped, say which. State
what is done and verified plainly, without hedging — and never report as passing something you did not run.
