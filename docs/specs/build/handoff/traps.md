# Traps — things that have already cost time here

Each one was paid for at least once. They are ordered by how much damage they do.

---

## 1. Both `.env` files point at production

`.env` sets **`DATABASE_URL` and `APP_DATABASE_URL`** to the production RDS
instance. `.env.scratch` is `streamlineos_scratch` **on that same production
host**.

- No suite, seed, migration or probe may run against either.
- Never set `ALLOW_PRODUCTION_MIGRATION=1`.
- Do not query production to check whether seed rows exist. Ask first.
- The controller e2e tier **has already written to production** in this
  program's history. `*e2e-spec` files run only under `pnpm test:e2e`, which is
  exactly why nobody noticed sooner.

Corollary: `DATABASE_URL` alone does not repoint the app — the backend reads
more than that one variable.

---

## 2. A gate that resolves zero files reports zero violations and exits green

This is the single most repeated failure in this repo.

- `check:tenant-neutral` had **never run on Windows**: it compared `relative()`
  output against `"features/"`, and backslashes made that 0 of 7,081 files. It
  reported nothing wrong for months.
- `check:prd-traceability` reported `EMPTY REGISTRY` — a *vacuous* gate, not a
  passing one — because the file it reads had been deleted.

**Always run `--self-test` before the gate, and record a resolved-file or
resolved-import count.** A green gate with no count is not evidence.

### The variant that self-tests do not catch

An **allowlist cannot see a deletion**. `check-prd-traceability`'s
`REQUIRED_EVIDENCE_MD` names 23 load-bearing files, but it only ever asks "is
this file on disk allowed?" — never "does this listed file still exist". All 23
were deleted and the gate said nothing. When a gate names paths as
load-bearing, check whether it asserts their existence; if not, those paths are
documentation, not enforcement.

---

## 3. Jest does not typecheck

`frontend/tsconfig.json` **excludes test files**, and next/jest transpiles
through SWC, which erases types with no diagnostics. A test file can carry
dozens of type errors and be green forever.

`frontend/scripts/check-test-typecheck.mjs` is the only gate that sees them.
It currently reports **121 errors across 38 files**.

Related: an agent can only run checks that cannot see type errors, so
**arity changes and missing props are invisible to every check an agent is
allowed to run** — only the coordinator's 8 GB `type-check` sees them.

---

## 4. `git add` + a bare `git commit` is not pathspec-safe

This working tree is shared by concurrent sessions that stage and commit
continuously. `git commit` **without a pathspec takes the entire index**,
including whatever a peer staged in the seconds since your `git add`.

It happened twice in one session here: `8f0143bc4` and `0b6a6f258` each swept
in a peer's cycles work and `docs/specs/README.md`. Nothing was lost; the
history is now misleading, and **CLAUDE.md §1.14 bars fixing it** (no
`reset`/`rebase`/`checkout`).

**Use:**

```
git commit -m "…" -- <explicit file paths>
```

That form commits only those paths and ignores the rest of the index.
Commits made this way in the same session came out at exactly 1–2 files.
Name files, never directories. Verify **after** with `git show --stat <sha>`,
not only before with `git diff --cached`.

It also runs the other way: a peer's commit can swallow *your* work. A clean
`git status` does not mean your edit was lost — run
`git log --oneline -2 -- <path>` before redoing anything.

---

## 5. Agents report confidently and are sometimes wrong

Every agent claim in this program is re-derived from source before being
accepted. That caught, in one session:

- **An agent shipping `any`.** Asked to fix 46 type errors, it used
  `as (...args: any[]) => any` — banned by §6 — and *silently dropped*
  `.mockResolvedValue(undefined)`, changing runtime behaviour under cover of a
  type fix. Always diff for `as any`, `as unknown as`, `@ts-ignore`,
  `@ts-expect-error`, `!` abuse, and for weakened or deleted assertions.
- **An agent inverting a correct measurement.** Its contrast numbers were right;
  its proposed token change would have broken the test that documents the
  design. The measurement was kept, the conclusion discarded.
- **An agent citing file-reading as evidence** for `BLD-10-037`. Replaced with
  an executed run (38/38).
- **Reported test counts that do not reconcile.** One agent's per-file table
  summed to 58 where execution gave 54. The diff, not the report, is the proof.

Also: agents shrink scope to pass a rule, invent environmental blockers, and
narrate ticks they never wrote. Check the file.

---

## 6. Measuring a tree while other sessions edit it

A file-size count moved 8 → 9 mid-session because a peer was editing
`cycles-page.tsx`. **A number taken over a tree under concurrent edit is a
snapshot, not a fact.** Record the revision with the number, and never let two
agents — or an agent and a peer — own the same file.

`features/build/command-center/**` is owned by a peer session and is excluded
from all packets.

---

## 7. Gates that read a vendored contract

`check:command-catalog` and `check:permission-binding` resolve "what the
contract requires" from `frontend/contracts/openapi.json`. When that file is
stale, every finding is measured against a contract that is not the backend's.

It passes today (`e04d996eb` re-vendored it), but **verify each finding against
the backend `@RequirePermission` decorator before treating it as a defect**.
That is how the three Build findings in `49a167a5e` were confirmed.

---

## 8. Windows specifics

- `execSync` with a quoted glob returns nothing.
- Path separators break any gate comparing `relative()` output to a
  forward-slash prefix (trap §2).
- A deleted file leaves `tsconfig.tsbuildinfo` stale and the next `type-check`
  **false-passes** against it. Delete it after another session moves files.
- `rg` without `--glob '!*.tsbuildinfo'` matches the build cache and returns a
  1.7 MB line that hides the real answer.
- A `NUL` byte makes a file invisible to ripgrep entirely.
- Postgres on Windows dies under memory pressure; do not run a heavy build and
  a database load at once.

---

## 9. Credit and machine control

One test batch at a time, `--runInBand`, explicit paths. Never the whole suite
or watch mode without being asked. Do not overlap heavy builds or typechecks —
including with a running agent. Stop after two failed repair hypotheses, report
the missing discriminator, and move to independent work.
