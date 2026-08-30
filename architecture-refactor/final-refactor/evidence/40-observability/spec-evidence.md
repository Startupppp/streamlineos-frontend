# Unit spec evidence — log context completeness

Run in `backend/` on 2026-08-29.

---

## log-context-completeness.spec.ts (4 tests)

```
$ node ./node_modules/jest/bin/jest.js src/common/observability/log-context-completeness.spec.ts --no-coverage

PASS src/common/observability/log-context-completeness.spec.ts
  log context completeness
    √ a log line emitted inside a request context carries all mandatory fields, asserted on the JSON output (18 ms)
    √ all seven fields are absent when no context is active — proves the test would fail on a gap (2 ms)
    √ redactor strips secrets from metadata even inside a full context (3 ms)
    √ release field persists on every log line within the same context (3 ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
Time:        2.603 s
```

All assertions are on the parsed JSON written to `process.stdout.write`, not on the input object. The no-context test proves the test suite would fail if any of the seven fields were dropped: it asserts all seven are absent when no context is active, which is the correct inverse of the first test.

---

## Regression check — logger.service.spec.ts (7 tests)

```
$ node ./node_modules/jest/bin/jest.js src/common/logger/logger.service.spec.ts --no-coverage

PASS src/common/logger/logger.service.spec.ts
  logger
    √ emits one parseable JSON record per call (28 ms)
    √ omits context fields when there is no ambient context (4 ms)
    √ stamps every record with the ambient correlation, organisation and actor (2 ms)
    √ redacts credentials passed in metadata (3 ms)
    √ summarises an Error in metadata instead of emitting an empty object (16 ms)
    √ includes the cause chain so a driver error's root is visible (3 ms)
    √ writes warnings and errors to stderr and everything else to stdout (2 ms)

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
Time:        2.69 s
```

No regressions in the existing logger tests.

---

## TypeScript: no new errors in changed files

```
$ NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit 2>&1 | grep -E "(observability|correlation-id|logger)"
(no output — zero errors in the three changed files)
```

Pre-existing errors in `src/modules/expenses/expense-outbox.spec.ts`, `src/modules/ownership/__tests__/ownership.service.spec.ts`, and `src/modules/users/user-ops-bulk-update.spec.ts` are from other sessions' in-flight work and are not introduced by this ticket.
