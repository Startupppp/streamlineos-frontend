# Three commits whose messages describe a fraction of their contents

Recorded 2026-09-07. **Do not attempt to rewrite these** — rebase and reset are barred
for this role, and the content is intact in every case. The cost is history, not code.

This working tree is shared by concurrent sessions. A commit without a pathspec takes the
whole index, and the index is populated by whoever staged last.

| Commit | Message says | Actually carries |
|---|---|---|
| root `d7d31d72b` | "Refactor imports and remove unused constants in HR expenses module" | **867 files** — an entire OpenAPI/response-contract wave plus a shared-component move, captured mid-flight while 21 agents were writing |
| backend `6f08a6608` | "Refactor and enhance type safety across various modules" | **57 files**, taken while five agents were still writing them |
| root `ae93e01cc` | "mirror the payroll and surveys schema corrections client-side" | **106 files** — the 13 payroll/surveys hook files it describes, plus a concurrent accounting-expenses lane and a regenerated `contracts/openapi.json` |

`d7d31d72b` and `6f08a6608` were taken over a tree holding **1,266 known frontend type
errors**, so both record a state that never compiled. That is not a regression they
introduced; it is when they were taken.

`ae93e01cc` is mine and was avoidable. `git add -- <paths>` followed by a bare
`git commit` is not pathspec-safe; only the pathspec on `commit` itself is
(`git commit -F msg.txt -- <explicit files>`), which ignores everything else staged.
Every commit after it in that session used that form and landed at its exact intended
file count.

## What this means for reading the history

- Do not infer scope from these three messages. Use `git show --stat`.
- A file's `git log -1` may name a commit that has nothing to do with it.
- A clean `git status` here does not mean work was lost — check `git log` first.
