import { readFileSync, writeFileSync } from 'node:fs';

const cls = JSON.parse(readFileSync('.scratch/release-eod/criteria-class.json', 'utf8'));

const DISPOSITION = `**CLOSED 2026-09-04 — OWNER-DISPOSITIONED, not measured.** Signed in [OWNER-DISPOSITION-2026-09-04.md](final-refactor/evidence/42-production-ops/release-authority/OWNER-DISPOSITION-2026-09-04.md). No deployed environment and no second signatory exists; the owner accepts the residual risk and the criterion is dispositioned, not waived. It may not be cited as measured evidence.`;

// CODE criteria that remain genuinely open, each with its named blocker.
const OPEN = {
  'PRD-C005': 'Query-cost gates are green (`check:query-projections` 0 in-scope, `check:db-call-count`, `check:unbounded-reads`, `check:cache-invalidation`), but the ticket-29 performance half is blocked with PRD-C140.',
  'PRD-C006': '`check:route-bundle-budget` exit 1 — 9 measured breaches; `check:web-vitals-budget` refuses its capture as unusable evidence.',
  'PRD-C018': 'Disposable-database E2E was NOT run. `test:e2e:seeded` requires a database whose name contains `scratch`; none is bootstrapped to head 685.',
  'PRD-C021': 'One code-level P1 is open and unresolved: `verify:chat-mentions` proves mention delivery is broken (see PRD-C127).',
  'PRD-C053': '`check:tenant-relationships` exit 2 — INCONCLUSIVE. Its required target `scratch_boot_a` is mid-bootstrap, not at head 685.',
  'PRD-C055': 'Two clean bootstraps plus an interrupted-then-resumed bootstrap were NOT run at this commit pair.',
  'PRD-C056': 'Depends on PRD-C055; no current-head bootstrap evidence bundle exists at journal head 685.',
  'PRD-C060': 'Depends on PRD-C053 and PRD-C055 — canonical composite keys cannot be signed off without clean-bootstrap/catalog parity at head.',
  'PRD-C064': 'Depends on PRD-C055. The post-cleanup re-proof requires two clean bootstraps and catalog parity.',
  'PRD-C085': '`check:route-budgets` exit 1 — POST /chat/channels/{channelId}/messages measures p95 5,043 ms against a 1,000 ms ceiling and 3 downstream calls against a ceiling of 0.',
  'PRD-C104': '`check:test-suppressions` exit 1 — 66 runtime-selected suppressions against a ratchet of 29. 65 are infrastructure-gated suites (55 `*.db.spec.ts` needing a live database, 9 `*.eval.spec.ts` needing an AI provider key, 1 perf e2e). The ratchet was NOT raised.',
  'PRD-C127': 'GENUINE FAILURE found today: `verify:chat-mentions` against a live API returns "Alex should receive exactly 1 mention, got 0" and "@everyone notified nobody — the send path never expands it."',
  'PRD-C132': 'Blocked with PRD-C127 — mention notifications are not delivered, so notification delivery cannot be re-verified at this commit.',
  'PRD-C140': '`check:benchmark-manifest` exit 1 — the manifest is 366 commits stale and was captured on a dirty tree. A fresh capture needs a live API server under load.',
  'PRD-C141': 'Depends on PRD-C140; no current latency evidence exists at this commit.',
  'PRD-C142': 'Depends on PRD-C140; statement-level p95 evidence requires a production-shaped seed and a fresh capture.',
  'PRD-C143': 'Depends on PRD-C140; cache-hit latency evidence requires a fresh capture.',
  'PRD-C145': 'Blocked by PRD-C085 — the chat message path is measurably over its declared budget.',
  'PRD-C148': 'Depends on PRD-C140 — a regression gate cannot be armed against a stale manifest.',
  'PRD-C149': '`check:web-vitals-budget` refuses its capture: 16 unusable samples, and no production-build provenance. Requires a running backend, Chrome CDP and an authenticated session.',
  'PRD-C151': 'Blocked with PRD-C006 — 9 route bundle breaches; the shared authenticated shell alone is ~488 kB gzip of a 524 kB ceiling, which is structural.',
  'PRD-C152': 'Depends on PRD-C140 — AI streaming latency targets need a fresh capture.',
  'PRD-C156': 'Cannot be true while the criteria above remain open.',
  'PRD-C158': 'Builds and typechecks pass at this commit pair, but disposable E2E (PRD-C018) was not run and architecture gates are not all green.',
  'PRD-C159': 'Blocked with PRD-C055 — the bootstraps were not run.',
  'PRD-C160': 'One code-level P1 remains unresolved — see PRD-C127.',
};

const GATE_EVIDENCE = `**CLOSED 2026-09-04 at frontend/root \`HEAD\` + backend \`HEAD\`.** Evidence: the full two-repository gate run recorded in [RELEASE-RECORD-2026-09-04.md](final-refactor/evidence/42-production-ops/release-authority/RELEASE-RECORD-2026-09-04.md) — every gate, its exit code and its counted corpus. Backend typecheck exit 0; frontend source typecheck exit 0; frontend production build exit 0; migration ledger 685/685.`;

const map = {};
for (const [id, meta] of Object.entries(cls)) {
  if (meta.cls === 'DEPLOYED' || meta.cls === 'HUMAN') {
    map[id] = { state: 'x', evidence: DISPOSITION };
  } else if (OPEN[id]) {
    map[id] = { state: ' ', evidence: `**OPEN — named blocker.** ${OPEN[id]}\nOwner: the repository owner. Recorded in the release record; not waived.` };
  } else {
    map[id] = { state: 'x', evidence: GATE_EVIDENCE };
  }
}

const closed = Object.values(map).filter((m) => m.state === 'x').length;
const open = Object.values(map).filter((m) => m.state === ' ').length;
const disp = Object.entries(map).filter(([id]) => cls[id].cls !== 'CODE').length;
console.log(`total ${Object.keys(map).length}  closed ${closed}  open ${open}`);
console.log(`  of closed: ${disp} owner-dispositioned (DEPLOYED/HUMAN), ${closed - disp} closed with gate evidence (CODE)`);
console.log(`  open are all CODE: ${open}`);
writeFileSync('.scratch/release-eod/prd-status-map.json', JSON.stringify(map, null, 2));
