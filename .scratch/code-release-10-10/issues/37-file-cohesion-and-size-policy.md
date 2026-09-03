# 37 — File cohesion, size policy and published inventories

**What to build:** The §2.2 close-out. Both hard-500 gates already exist and pass; this proves the policy at the release commit, publishes the inventories, and confirms every split preserved behaviour.

**Blocked by:** 36.

**Status:** done — 8/8 boxes closed. Two gates are left red by other territories: frontend `check:file-sizes` (3 files, none in this territory) and backend `check:over-300` (400/394, +0 from this ticket). Neither baseline was moved. Report: `reports/37-file-cohesion.md`.

- [x] The hard-size gate scans every applicable workspace with a vacuity floor and fails on a new unregistered file over the limit. Excluded modules are reported separately.
    Backend `check:file-sizes` exit 0, 3,544 files, vacuity floor MIN_FILES=50 asserted by a disk fixture; a 501-line unregistered file fails the gate (self-test `over-limit with no exception: reason=violations`). Frontend exit 1 with MIN_FILES=200 and CRM/Inventory tallied separately as informational.
    PARTIAL: the frontend gate is correctly RED on `hooks/api/notifications-inbox.ts` (534), `hooks/api/accounting/banking.ts` (501) and `features/hr/cases/cases-page-content.tsx` (501). All three are in other lanes' territories — `banking.ts` crossed 500 during this session and `cases-page-content.tsx` was being edited minutes before the measurement. The gate biting is the box; the three splits belong to their owners.
- [x] The exception registry fails closed: missing or stale paths, line counts, owners, interfaces, reasons or review dates fail, and a file that falls to the limit or below automatically loses its exception.
    Both repos now enforce the same seven rules, each covered by a disk fixture: missing path, stale count, at-or-below-limit, wildcard, directory-wide, blank cell, non-ISO review date, duplicate registration. Self-tests 39 (backend) / 42 (frontend), both exit 0. Enforcing it found seven of twelve backend rows wrong — five files had fallen below the limit and kept their exemption, two had grown 736 lines combined under an unread justification.
- [x] Generated, vendor and migration exclusions are path-classified and never exempt ordinary authored implementation transitively.
    Frontend exclusions are anchored directory names in `check-repo-paths.mjs`, self-tested to exclude `.next`, `.next-buildmart`, `node_modules` while still scanning `build/`, `features/`, `next-intl/` — no prefix or substring matching. `contracts/` and `dist/` were opened and hold no `.ts`/`.tsx`; `public/` holds only the bundled widget and `sw.js`. Backend scans all of `src/` with no directory exclusions at all; `migrations/` is outside the scanned root and the only suffix exclusions are the exact `.d.ts` / `.spec.ts` / `.e2e-spec.ts`.
- [x] Every registered exception records exact path and measured lines, category, owner, public interface, a concrete cohesion argument, alternatives considered, review date and removal trigger. No directory-wide or wildcard exception exists.
    All 7 surviving backend rows rewritten to the nine-column record and re-measured against disk. The parser rejects `*` and a trailing `/` as errors rather than ignoring them. The frontend registry documents the same contract and holds zero rows.
- [x] Splits are by cohesive responsibility — never numbered fragments, pass-through wrappers, re-export shells or mutually dependent files created to satisfy a counter.
    Four files split: `gdpr-subject-erasure.service.ts` 653→244, `ai-gateway-runner.helper.ts` 527→211, `storage.service.ts` 509→389, `cron-hr-retention.service.ts` 504→317. Seams are erasure-domain, shared call gauntlet, byte placement, and document retention. Every extracted module imports one-way; `check:cycles` is 0 in both repos (5,475 / 5,228 files). None of the four was registered as an exception instead.
- [x] Over-300 and over-500 inventories are published for both repositories at the final commit.
    `reports/37-file-cohesion.md` §8: backend over-500 (7 files, all registered) and over-300 (400 files, full list plus distribution by module); frontend over-500 (6 files) and over-300 (519 files, full list plus distribution by area).
- [x] Each extraction is proven to preserve behaviour, import direction, DI registration, route ownership, caching and authorization.
    Focused jest before and after each split, same suites, same counts: GDPR 101/101, AI 515/515, storage 191/191, cron retention 51/51 — all exit 0. GDPR statement order inside the transaction is unchanged, which the round-robin mocks and the `tablesAnonymised` assertions depend on. No controller, module or DI constructor shape changed; `check:module-di`, `check:module-registration`, `check:import-direction`, `check:cache-invalidation`, `check:record-access`, `check:scope-application`, `check:tenant-isolation` all exit 0.
- [x] Splitting a file breaks its direct importers and drops it from path-keyed gates; both are re-run rather than assumed.
    Three path-keyed gates were actually broken by the splits and all three were re-run and fixed: `check:lifecycle-predicates` (3 stale `ACCEPTED` entries re-keyed), `check:unbounded-reads` (RED on an unclassified cron file; also a dangling GDPR FALSE-POSITIVE re-keyed), `check:db-call-count` (cron entry re-keyed, and the per-policy loop it had been masking classified on its own terms). `src/common/slo/slo-queues.ts` `sourceFile` keys checked — none of the four appears. All 58 other backend `check:*` scripts were run; the 7 red ones name no file this ticket touched. Importers re-run through both typechecks and the four jest suites.

---

**Status addendum (2026-09-03) — backend `check:over-300` is now GREEN, and the baseline went DOWN.**
This ticket closed with "backend `check:over-300` (400/394, +0 from this ticket)" left red for
another territory. It has been resolved as a ticket-41 blocker: the count came down rather than the
baseline going up. **Baseline 394 → 392, count 406 → 392, `rc=0`**, by splitting fourteen files
along a responsibility seam; self-test `rc=0` (15 passed). Per-file seams, the four cohesive
catalogues deliberately left whole, and the corrected history of the gate's single baseline raise
(it was justified but undershot by one, so `c3f0b73d` shipped the gate red) are recorded in
`file-size-exceptions.md` under "## The over-300 ratchet (backend) — 2026-09-03". Report:
`reports/41a-over-300-and-wizard-swallow.md`.
The baseline now sits at exactly the measured count, so the next file any agent pushes over 300
turns it red again — that is the ratchet working, and the lander owns the split.
`check:file-sizes` remains red on files outside this work (six at the last measurement, four of
which appeared between two runs minutes apart), and the frontend `check:over-300` twin is red at
520/519 — one file above — and still needs an owner.
