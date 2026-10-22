# Read-options boundary fix (lanes RO1..RO3)

## The defect
Every `lib/prefetch/*.ts` runs on the server (imported by server `page.tsx`). It imports `xQueryOptions` factories from hook modules that start with `"use client"`. In the RSC graph every export of a `"use client"` module is a client reference; calling it on the server throws "Attempted to call X from the server but X is on the client". The prefetch's `try/catch` swallows it and returns an empty state, so the page never gets server data. Jest cannot see this (no RSC boundary in jest).

## The fix (house pattern)
For each factory a prefetch imports from a `"use client"` module (directly or transitively):
1. MOVE (never copy, never alias, never wrap) the factory into a sibling non-client file named `<hook-file>-read-options.ts` (e.g. `hooks/api/hr/exit.ts` -> `hooks/api/hr/exit-read-options.ts`). If the folder already has a suitable `*-read-options.ts` for that hook file, add to it. No `"use client"` in it.
2. The read-options file holds only key + staleTime factories (and pure helpers they need, e.g. `localDateKey`). It may import query-key modules (`@/lib/query-keys/<domain>`), types (`import type`), constants and pure libs. It must NEVER import, even transitively, a module starting with `"use client"`. If a factory needs a constant that lives in a `"use client"` file, move the constant into the read-options file and import it back from there.
3. The hook module imports the factory from the read-options file and keeps spreading it. Every other importer of the factory (prefetch, tests, features) imports it from the read-options file. Delete the factory from the hook module. Grep proves it is defined exactly once.
4. A schema/contract file that a prefetch imports must not import a `"use client"` module either (e.g. `managed-products-schema.ts -> authorized-mutation.ts`): move the needed pure piece out, or import only types.
5. Keys, params, staleTime and gating stay byte-for-byte identical. Behaviour does not change.

## Gate (USER RULE: do not run it)
Do NOT run jest/eslint/any script (user tests it). The gate is lib/prefetch/query-options-consumers.test.ts test 3 ("no prefetch reaches a use client module") lists offender chains. Every chain starting at one of YOUR prefetch files must be gone. Tests 1-2 must stay green.

## Hard bans
No git. No tsc / type-check / next build / whole-suite jest. Never connect to a DB. No code comments. No forwarding functions or alias exports (FE-126). Export only what another file imports (FE-134). Do not edit docs/perf-program/TODO.md. Edit only the prefetch files and the hook/read-options/schema files their imports reach; list anything else under "Needs coordinator".

## Verify
Verify by reading and grepping only, never by running scripts. Tests that `jest.mock` a hook module and reference the factory must be re-pointed at the read-options module (never weaken an assertion).

## Report
Per prefetch file: factories moved (from -> to), offender chains before/after, files created, tests run + results, needs coordinator.
