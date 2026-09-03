# P1 — `undici`/`jsdom` skew broke server rendering on every route reaching `isomorphic-dompurify`

Raised independently by three sessions (tickets 30, 45, and `p1-three-production-defects.md`).
Territory: `frontend/package.json`, `frontend/pnpm-lock.yaml`, `frontend/pnpm-workspace.yaml`,
`frontend/components/ai/ai-inline-preview.tsx`.

**Status: FIXED and proved at runtime.** Commit `e1fa3f4a5` (streamlineos-frontend).

---

## 1 · Root cause — a major-version override, not a lockfile drift

The failing require is one line of jsdom:

```
jsdom@29.1.1/lib/jsdom/browser/resources/jsdom-dispatcher.js:8
  const WrapHandler   = require("undici/lib/handler/wrap-handler.js");
  const UnwrapHandler = require("undici/lib/handler/unwrap-handler.js");
```

`jsdom@29.1.1` declares `undici: "^7.25.0"`. `frontend/pnpm-workspace.yaml` carried a
**global override `undici: ">=8.9.0"`**, which resolved it to **8.10.0** — one major above
what jsdom supports. Measured on disk, `undici@8.10.0/lib/handler/` contains exactly six
files and **neither `wrap-handler.js` nor `unwrap-handler.js`**:

```
cache-handler.js  cache-revalidation-handler.js  decorator-handler.js
deduplication-handler.js  redirect-handler.js  retry-handler.js
```

`undici@7.29.0` ships **eight** — the same six plus `wrap-handler.js` and `unwrap-handler.js`
(verified from the published tarball, not inferred).

### The real resolution graph

```
pnpm -C frontend why undici
  isomorphic-dompurify 3.18.0
  └─┬ jsdom 29.1.1
    └── undici 8.10.0          <- forced by the global override

pnpm -C frontend why jsdom
  dependencies:    isomorphic-dompurify 3.18.0 └── jsdom 29.1.1
  devDependencies: jest-environment-jsdom 29.7.0 └── jsdom 20.0.3
```

**The "two jsdom copies" clue is a red herring.** `jsdom@20.0.3` (dev, via
`jest-environment-jsdom`) has **no `undici` dependency at all** — it predates jsdom's move to
undici. Only the production `jsdom@29.1.1` was affected. Confirmed by symlink:
`.pnpm/jsdom@20.0.3/node_modules/` contains no `undici` entry.

**`jsdom` is the only consumer of `undici` in the entire tree** (`grep -c "undici: " pnpm-lock.yaml`
= 2: the override line and jsdom's edge). So the global `>=8.9.0` override existed solely to
bump jsdom's undici, and it bumped it straight past the major boundary jsdom supports.

### Why the override existed, and why relaxing it is safe

It is one of ~30 bulk advisory overrides added in `1c9e303ad`. Queried against the npm advisory
database (`registry.npmjs.org/-/npm/v1/security/advisories/bulk`), **every advisory that
`>=8.9.0` remediates is also fixed in `7.29.0`** — each one is published as a *pair* of ranges:

| Advisory | Severity | Fixed in 8.x | Fixed in 7.x |
|---|---|---|---|
| GHSA-4cwx-7wf7-3272 — cross-user disclosure via private cache directives | high | `>=8.0.0 <8.9.0` | `>=7.0.0 <7.29.0` |
| GHSA-8xcm-r25x-g524 — response desync via retry interceptor | moderate | `>=8.0.0 <8.9.0` | `>=7.0.0 <7.29.0` |
| GHSA-jr45-8vmc-qm54 — disclosure via whitespace in Cache-Control | moderate | `>=8.0.0 <8.9.0` | `>=7.0.0 <7.29.0` |
| GHSA-m8rv-5g2x-5cg5 — CRLF injection via blob `type` | moderate | `>=8.0.0 <8.9.0` | `>=7.0.0 <7.29.0` |
| GHSA-v3r7-h72x-cjcm — cookie attribute injection | moderate | `>=8.0.0 <8.9.0` | `>=7.0.0 <7.29.0` |

`7.29.0` is the current 7.x tip and no advisory in the database covers it. **The security floor
is preserved, not lowered.**

## 2 · The fix — one scoped override line

`frontend/pnpm-workspace.yaml`:

```yaml
  undici: ">=8.9.0"
  "jsdom>undici": ">=7.29.0 <8"      # added
```

The global `>=8.9.0` is **kept** so any future undici consumer still gets the 8.x floor; only
jsdom is scoped down to the range it actually declares support for.

The resulting lockfile diff is **11 lines and touches nothing but undici**:

```
 overrides:
+  jsdom>undici: '>=7.29.0 <8'
-  undici@8.10.0:  resolution: sha512-HvltHd7…  engines: {node: '>=22.19.0'}
+  undici@7.29.0:  resolution: sha512-IDxfleL…  engines: {node: '>=20.18.1'}
   jsdom@29.1.1(@noble/hashes@2.0.1):
-      undici: 8.10.0
+      undici: 7.29.0
-  undici@8.10.0: {}
+  undici@7.29.0: {}
```

No unrelated entry was rewritten. `pnpm install` completed in 4.9s.

## 3 · Should `isomorphic-dompurify` be there at all?

Evaluated on evidence, and the answer is **it stays — and the resolution was the right fix**.

**Sanitising here is load-bearing.** `ai-inline-preview.tsx:126` renders *model-generated HTML*
through `dangerouslySetInnerHTML`. That is untrusted input by definition.

- **"Sanitise on the client only" is not an option — it is the vulnerability.** The component is
  `"use client"`, but Next.js still **server-renders** client components. If the server skipped
  sanitising, the raw HTML would be serialised into the SSR payload and the RSC flight data, and
  the browser would parse it *before hydration ever ran*. `<img onerror=…>` fires at parse time.
  This would convert a build error into a live XSS.
- **A server-safe sanitiser without a DOM is genuinely viable** — and one is already installed.
  `sanitize-html@2.17.7` and `@types/sanitize-html` are already direct dependencies, already used
  at `features/help-centre/components/public-article-content.tsx`. It parses with `htmlparser2`,
  needs no DOM implementation, and is **80 KB against 15 MB** for the jsdom subtree
  (`jsdom` 8.3M + `undici` 2.0M + `css-tree` 2.0M + `@asamuzakjp/css-color` 824K +
  `tough-cookie` 760K + `parse5` 416K + `@asamuzakjp/dom-selector` 236K).
- **But swapping only this one file would have been the wrong fix.** `isomorphic-dompurify` has
  **eight** importers, not one:

  ```
  components/ai/ai-inline-preview.tsx
  features/mail/mail-html-viewer.tsx
  features/feedbucket/components/feedbucket-ai-panel.tsx
  features/hr/recruitment/offer-templates/offer-templates-page.tsx
  features/hr/exit/exit-management-page.tsx
  features/hr/documents/template-preview-panel.tsx
  features/hr/documents/template-table-cells.tsx
  features/hr/global/contingent-page-content.tsx
  ```

  Changing one leaves jsdom installed, leaves it in the server graph of `/mail` and every
  `/hr/*` route, leaves those routes 500ing, and introduces a second sanitiser convention in a
  codebase where `isomorphic-dompurify` leads 8:1. Fixing the resolution repairs **all eight and
  every route at once**; the one-file swap repairs none of them.
- **Making the import dynamic** was rejected for the same reason: it would hide the board's
  symptom while leaving the defect live everywhere else, and an `ssr: false` preview is a
  behaviour change, not a fix.

`components/ai/ai-inline-preview.tsx` was therefore **left unchanged**. The blast radius is wider
than the board because `components/ai/index.ts` re-exports `AiInlinePreview`, and **49 modules
import that barrel** — any one of them drags jsdom into its route's server graph.

## 4 · Proof — the route actually renders

A typecheck cannot see this defect; only a real request can. Two independent layers:

**(a) Module resolution, before and after** — deterministic, outside Next:

```
$ node -e "require('isomorphic-dompurify')"          # BEFORE
Error: Cannot find module 'undici/lib/handler/wrap-handler.js'
Require stack: …/jsdom/lib/jsdom/browser/resources/jsdom-dispatcher.js → … → isomorphic-dompurify/dist/index.js

$ node -e "const D=require('isomorphic-dompurify'); console.log(D.sanitize('<img src=x onerror=alert(1)><b>hi</b>'))"
LOADED OK; sanitize test: <img src="x"><b>hi</b>      # AFTER — and the onerror is stripped
```

**(b) HTTP, against the live stack.** `next dev` :3000, backend :1501 against
**`scratch_t30_browser`** (a scratch database, confirmed from the backend process env), org
`aaaaaaaa-1111-0000-0000-000000000001`, owner `bbbbbbbb-0001-0000-0000-000000000001`, session
`335d656c-…`, project **20**, workspace **31510333-f0af-4f1d-bbaa-969b0aecf845**. Session cookie
minted with `frontend/.scratch/mint-session.mjs` using the running server's 64-character
process-only secret (the repo `.env`'s 36-character one does not match a running server and 307s
to `/signin`).

**A restart was required, and this is worth recording.** The dev server that was live when the
fix landed *kept* 500ing afterwards. Next 16 loads jsdom as a Turbopack **external module**
(`Failed to load external module jsdom-e210b1f5eeb3f5c5`) and **memoises the failed load for the
life of the worker process** — so a node_modules repair is invisible to an already-running dev
server. Any agent who tests this fix without restarting will wrongly conclude it did not work.
The server was confirmed idle (0 log bytes over 2 minutes) before it was restarted, and it was
brought back on :3000 with its original flags so the shared endpoint is unchanged for others.

| Route | Before | After |
|---|---|---|
| `/build/workspaces/31510333-…/20` (board root) | **500** ×3 | **200** ×3 (53,681 B) |
| `/build/20/backlog` | 500 | **200** |
| `/build/20` | — | **200** |
| `/mail` | — | **200** |
| `/dashboard` | 200 | **200** |

`grep -c "wrap-handler|Failed to load external module jsdom"` over
`.next/dev/logs/next-development.log` after all probes: **0**.

The board root returns the authenticated shell with `build/workspaces` present three times in the
RSC flight payload, in the client org-bootstrap state ("Syncing organization") — the board body
itself is client-fetched, so SSR legitimately stops there. The load-bearing result is that the
page **module graph now loads**; previously it threw before render began (the old stack shows the
throw coming from `next/dist/server/load-components.js`, i.e. at page-module load, not at render).

## 5 · Gates

| Command | Exit | Number |
|---|---|---|
| `pnpm -C frontend install` | 0 | 4.9s · lockfile diff 11 lines, undici only |
| `pnpm -C frontend type-check` (`tsc --noEmit`) | **0** | **0 errors** |
| `pnpm -C frontend exec jest --runInBand --testPathPattern="components/ai"` | **0** | **6 suites / 78 tests passed** |
| `curl` × 3, board root | — | **200 / 200 / 200** |
| `node -e "require('isomorphic-dompurify')"` | 0 | loads; `onerror` stripped |

Jest is unaffected because `jest-environment-jsdom` uses `jsdom@20.0.3`, which has no undici
dependency; `ai-nine-states.test.tsx` renders `AiInlinePreview` itself and passes.

**Not run:** frontend lint, `next build`, the full jest suite, browser journeys.

## 6 · Cross-territory findings

1. **`isomorphic-dompurify` puts ~15 MB of jsdom into the server graph of 8 components and, via
   the `components/ai` barrel, 49 modules — for one `sanitize()` call each.** `sanitize-html`
   (80 KB, no DOM implementation) is already a direct dependency and already in use in one place.
   Migrating all eight importers would drop `jsdom`, `undici`, `css-tree`, `tough-cookie`,
   `parse5` and the two `@asamuzakjp` packages from the production tree entirely and remove this
   whole class of failure. It spans `features/mail/`, `features/hr/`, `features/feedbucket/` and
   `components/ai/` — **four territories, not mine.** Recommended as a single owned change, never
   piecemeal: a half-migration leaves jsdom installed and buys nothing.
2. **The global `undici: ">=8.9.0"` override is now inert** — jsdom was its only subject and jsdom
   is now scoped. It is deliberately kept as a floor for future consumers, but anyone auditing the
   override list should know it currently governs nothing.
3. **Turbopack memoises failed external-module loads.** Worth adding to the brief's trap list: a
   node_modules fix is invisible to a running `next dev` worker, and the stale server reports the
   old error indefinitely.
