# PRD-C127–C129 / C156 Chat — executable evidence

Updated 2026-09-10. This existing record distinguishes commands run in the current
Windows workspace from the previous machine's database/provider evidence. It does not
certify production behavior or responsive browser acceptance.

## Current result

| Check | Observed result |
| --- | --- |
| Backend Chat unit selection | **53 suites / 503 tests PASS** |
| Backend entity-channel controller E2E | **1 suite / 12 tests PASS** after strengthening the successful-read control |
| Backend message/idempotency fixture follow-up | **2 suites / 18 tests PASS**, no missing-`tx.execute` error |
| Backend sender/timeline consolidation follow-up | **5 suites / 47 tests PASS** |
| Frontend Chat selection, excluding KB/support/assistant component directories | **26 suites / 234 tests PASS** |
| Entity-action accessibility follow-up | **1 suite / 6 tests PASS**, no missing-description warning |
| Read-path PostgreSQL suite | **NOT EXECUTED: setup refused, 0 tests**; no approved disposable database configured |
| Shared typechecks, cycle gates and contract gates | Release coordinator owns the final run and revision binding |
| Live mention delivery / Ably / Google Meet | Not rerun; no external messages or provider calls made |
| Browser loading/error/retry/responsive acceptance | Not verified in this run |

The previous all-green entity-channel count hid a malformed fixture: its no-join case
asserted only that no insert happened. Adding HTTP 200 reproduced a red control
(expected 200, received 500). The fixture now reuses the complete channel row and supplies
the nested membership/user shape; all 12 cases pass with no response-contract exception.
Negative cases still withhold unauthorized entity titles, including poll and thread reads.

The unit rerun also exposed two outdated transaction mocks. They now supply `execute`,
so deferred tenant work reaches its mocked reminder/cache dependencies. The XSS case
requires a successful write and asserts both retained text and absent script markup;
it no longer catches every error or conditionally skips its assertion.

The timeline now consumes the existing `SENDER_MEMBERSHIP_ID_ONLY` projection in all five
source locations: list, poll, thread parent, thread replies and the shared reply preview.
That covers eight executed relation selections without changing the selected fields.
Sender shape, tenant isolation, cursor ordering, poll pagination and reply-channel tests pass.

## Reproducible commands

From `backend/`, run the controller check with the existing isolated environment builder.
It generates a fresh Ed25519 signing key, disables workers and excludes external credentials
and `.env`. These loopback URLs are mocked harness targets, not an assertion that a server exists.

```powershell
@'
const { buildSeededProcessEnvironment, assertSeededProcessIsolation } = require('./test/helpers/seeded-process-environment');
const env = buildSeededProcessEnvironment({ ...process.env, DATABASE_URL: 'postgres://owner:test@127.0.0.1:5432/scratch_chat_mocked', APP_DATABASE_URL: 'postgres://streamline_app:test@127.0.0.1:5432/scratch_chat_mocked' }, 'scratch_chat_mocked');
assertSeededProcessIsolation(env);
const result = require('node:child_process').spawnSync(process.execPath, ['--max-old-space-size=8192', './node_modules/jest/bin/jest.js', '--config', './jest-e2e.json', '--runInBand', '--testPathPattern=chat-entity-channel.controller.e2e-spec'], { env, stdio: 'inherit', windowsHide: true });
process.exitCode = result.status ?? 1;
'@ | node -r ts-node/register/transpile-only
```

Backend unit selection and the follow-up after changing its two fixtures:

```powershell
$env:NODE_ENV='test'
$env:DOTENV_CONFIG_PATH='NUL'
node --max-old-space-size=4096 ./node_modules/jest/bin/jest.js --runInBand --testPathPattern=src/modules/chat/
node --max-old-space-size=4096 ./node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/modules/chat/chat-messages.service.spec.ts src/modules/chat/__tests__/chat-send-idempotency.spec.ts
node --max-old-space-size=4096 ./node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/modules/chat/__tests__/chat-message-wire-shape.spec.ts src/modules/chat/__tests__/chat-message-timeline-isolation.spec.ts src/modules/chat/__tests__/chat-position-cursor-ordering.spec.ts src/modules/chat/__tests__/chat-poll-pagination.spec.ts src/modules/chat/__tests__/chat-reply-target-channel-scope.spec.ts
```

From `frontend/`, the selection and the follow-up after adding the dialog description:

```powershell
node --max-old-space-size=4096 ./node_modules/jest/bin/jest.js --runInBand --testPathPattern=chat --testPathIgnorePatterns='features/support|wiki|kb|components/assistant|node_modules|.next'
node --max-old-space-size=4096 ./node_modules/jest/bin/jest.js --runInBand --runTestsByPath features/chat/entity-action-dialog.test.tsx
```

From `backend/`, the attempted database command:

```powershell
node --max-old-space-size=4096 ./node_modules/jest/bin/jest.js --config ./jest-db.json --runInBand --testPathPattern=chat-read-path-hardening.db
```

Actual result: `REFUSED: .db.spec.ts suites are DESTRUCTIVE` and `no *DATABASE_URL is set`.
The setup guard ran before the suite. Running its six cases requires an approved disposable
PostgreSQL database containing migrated Chat tables and at least one organization row,
all database URL variables directed at that target, and `ALLOW_DESTRUCTIVE_DB_TESTS=1`.
No remote application database was used as a substitute.

## Read-path fixture repair — execution still pending

The production `idx_chat_reply_reminders_pending` already exists in migration 1060 and the
Drizzle declaration. The former assertion queried literal `probe-org` in whatever seed
distribution happened to be installed, so a different valid index or a nearly all-due seed
could determine the result.

The corrected case clones the live reminder table and every live index definition into
`pg_temp` inside a rolled-back transaction. Its 40,000 rows span four tenants: 99.2% sent,
0.4% cancelled and 0.4% pending, with both future and due reminders. It checks exactly
20 due rows for the selected tenant, runs `ANALYZE`, then requires the exact pending index
and no sequential scan in `EXPLAIN (ANALYZE, BUFFERS)`. Other source indexes stay present,
so the case does not force its answer by removing competing indexes. No production index
or persistent fixture row changes. This controls planner distribution; it is not an RLS
benchmark because the temporary clone has no source-table RLS policies.

CHAT-002 remains open until this SQL executes successfully on the approved target.

## Huddle and provider reconciliation

The retired mesh controls and `GET /realtime/ice-servers` remain removal-ledger entries
marked `internal` in the API contract registry. They are not current product routes.
The former F2 failure and old KB registry-gap wording are not carried forward as open
Chat defects; the coordinator must bind current contract-gate results at integration.

`DATA-CATALOGUE.md` and `decisions/privacy-C185-provider-approvals.md` now agree: P15 is a
retired TURN/STUN relay with no current approval requirement. P11 Composio resolves the
Google connection and sends the channel name and meeting times to Google Calendar;
StreamlineOS stores the meeting URL and the browser joins Google Meet. P16 records this
current replacement boundary, with region/retention unestablished and approval unsigned.
Retiring TURN does not approve Google Calendar/Meet.

## Revision provenance and historical limits

Coordinator-provided base revisions: root/frontend `96d4ef1a5e2d7d6e9ff3a2bafd197f800043e037`,
backend `75ec87be3fcefd0490b2b93634ca6eaebc051e93`. The commands above tested the working
tree containing these repairs plus other uncommitted changes. This is not a clean revision
pair. Final root/backend/frontend revisions and shared gate results must be attached by the
release coordinator after integration (CHAT-003). No Git command was run by the Chat agent.

Working-tree SHA-256 for the controller fixture:
`189C85A5DBB108693C63CE23435BAC4FB8E370E256D57FD445BFBC9CBFF25ACB`.
Read-path fixture:
`419C71386F5775C993C6008F93C28095B612E283A23152C6A5BC0FDB297F5418`.
The final lint cleanup removes the unused full-schema registration from this insert-only
fixture; it does not need relational-query metadata. Database execution remains pending.
Accessible dialog:
`EBD883E863FFE2E88D4E5E1AC5F2472F48515CFC270A083BF117651469F7BEB0`.

The preceding 2026-09-09 record reported PostgreSQL 18.6 `scratch_local`, migration head
701, 899 RLS-enabled tables, a production-mode API and two live Ably mention probes.
That machine's database and provider run were not available for reproduction here.
Those observations remain historical context, not current-head proof. In particular,
this run does not renew its blanket statement that every product dimension is proven.
