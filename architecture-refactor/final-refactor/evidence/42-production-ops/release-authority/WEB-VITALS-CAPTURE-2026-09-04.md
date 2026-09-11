# Authenticated Web Vitals and route-byte capture — 2026-09-04

Covers PRD-C006, PRD-C149 and PRD-C151. **The capture is now usable evidence. The budgets are not met.**
Those are two separate results and this document keeps them separate.

## What changed

The recorded blocker was *"`check:web-vitals-budget` refuses its capture: 16 unusable samples, and no
production-build provenance."* The repository had never held a usable authenticated capture, and its own
manifest notes said of the byte figures *"do not quote them as current."*

There is now one. Provenance is checked by the gate itself, not asserted here:

```
Commits since capture: none — measured at HEAD (253dd749)
Provenance: the capture measured build i-RlhIuNl5z_NmhND7j78, which is the build on disk.
```

Environment: a real `next build` served by `next start`, authenticated with a minted session cookie,
against the API booted on a **cleanly bootstrapped** database at migration head 685/685 with the
application-role grants applied. 11 in-scope routes × 6 repeats × desktop and mobile profiles.

## Three things had to be fixed before a number could be trusted

| # | Problem | Why it invalidated the measurement |
|---|---|---|
| 1 | `rmSync` on Chrome's temp profile ran inside `finally` **before** the results were written, and `force: true` suppresses `ENOENT`, not `EPERM` | A Windows file lock threw out of `finally` and silently discarded a completed 22-minute capture. Fixed with a bounded retry that logs and continues — a leftover temp directory is harmless, a discarded capture is not. |
| 2 | `contracts/route-bundle-manifest.json` contained a duplicated `"notes"` key with no separating comma | The file did not parse, so **every** prior `--write-manifest` had silently failed to merge. |
| 3 | 3 samples hit the 6 s settle cap | Their CLS was only a FLOOR — late data shifted after measurement stopped. The producer refused the run itself. Re-run at `--settle-cap=30000`: **0 capped samples.** |

Fix 3 is a sensitivity change, not a weakened budget: no ceiling moved, and the three affected samples
turned out to be the *fullest* renders (575 and 1,150 words against 97), i.e. the honest ones.

One further sample was refused and excluded: `/crm/leads` rendered an **error boundary**. CRM is out of
release scope, so it does not block — but it is a real broken render and is recorded here rather than dropped.

## Result 1 — Core Web Vitals: 68 budget violations

Budgets are the repository's own, and are stricter than the PRD target on desktop
(desktop LCP ≤ 1500 ms vs the PRD's 2500 ms; TTFB ≤ 400 ms).

**The dominant term is TTFB, and it is not a page cost.** The breach carries a pre-existing recorded
exception naming the cause, and this capture confirms it rather than discovering it:

> `lib/rbac/get-server-access.ts` issues `GET /me/access` on **every authenticated server render**
> (React `cache()` dedupes within a render, never across them) — p50 503 ms on this machine. The same
> production server returns the public landing page in 9–13 ms TTFB, so no part of this number is
> bundle, route composition or render.

Because LCP ≥ FCP ≥ TTFB, that single round trip propagates into all three metrics. Desktop applies no
network emulation, so its TTFB is the server render alone.

The exception is **annotation only** — it names an owner and does not change the exit code, and the gate
prints "(still counted as a failure)" beside it. Breaches with **no** recorded owner include
`[desktop] /settings LCP p75 2126 ms`, `[mobile] /settings INP p75 1368 ms`,
`[mobile] /support/inbox LCP p75 2842 ms` and `[desktop] /parties FCP p75 1815 ms`.

CLS is the one metric that is broadly healthy — desktop samples measured 0.000–0.001 throughout.

## Result 2 — Route bytes: 13 of 13 routes breach

Over-the-wire encoded script bytes from a cold-cache navigation, against a 524,288-byte ceiling:

| Route | measuredScriptBytes | Over by |
|---|---|---|
| `/notifications` | 834,045 | 309,757 |
| `/build/inbox` | 818,251 | 293,963 |
| `/crm/leads` *(out of scope)* | 813,370 | 289,082 |
| `/inbox` | 807,371 | 283,083 |
| `/settings` | 795,865 | 271,577 |
| `/calendar` | 779,636 | 255,348 |
| `/dashboard` | 684,705 | 160,417 |
| `/build/my-work` | 657,248 | 132,960 |
| `/chat` | 627,049 | 102,761 |
| `/crm/inbox` *(out of scope)* | 583,582 | 59,294 |
| `/parties` | 578,395 | 54,107 |
| `/mail` | 574,977 | 50,689 |
| `/support/inbox` | 568,753 | 44,465 |

**This is worse than the 9 breaches previously recorded, and that is the point.** The older figure was
computed partly from stale and partly from hand-written values; four `measuredScriptBytes` entries had
been overwritten with "linear estimates" and were restored to captured values earlier in this session.
Measuring all 13 honestly moved the count from 9 to 13. No ceiling was raised to accommodate it — the
manifest diff touches only `measured*` fields.

## Verdict

- **PRD-C006 / PRD-C149 / PRD-C151 remain OPEN**, but the blocker has changed in kind: from
  *"the capture is refused and has no provenance"* to *"measured at HEAD; 68 vitals violations and
  13/13 route-byte breaches, with the dominant vitals term attributed to a per-render `GET /me/access`."*
- The remaining work is a performance change with a named owner, not a measurement problem.
- Nothing here was closed by moving a budget, adding an allowlist, or narrowing the corpus.
