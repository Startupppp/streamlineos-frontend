# Ticket 11 contraction gate

Captured: 2026-08-29

## Verified measurements

Commands run from `backend`:

- `pnpm scan:legacy-actors:self-test` passed.
- `pnpm scan:legacy-actors:check` passed its ratchet.
- `pnpm scan:legacy-actors` reported 563 source declarations: 555 organizational, 3 bridge, 5 authentication, 0 unknown.
- `pnpm scan:legacy-actors:catalog` reported 645 distinct catalog foreign-key columns, 100 invisible to the source scan, 18 source-only declarations, and a combined distinct burden of 663.

The source ratchet is unchanged at 555/555. A passing ratchet means no new source declarations were introduced; it does not satisfy the contraction gate.

## Gate result

Ticket 11 remains blocked. No contract migration can safely drop `users.id` organizational references while the catalog contains 645 distinct columns and communication actor migration ticket 09 is still `ready-for-agent`.

The compatibility function `legacyUserIdOf` remains required by the active migration seam. Removing it now would break callers owned by tickets 07–10.

No S7-owned contract migration was applied because there is no safe obsolete column set to remove yet. No actor-domain files were changed.

## Required unblock evidence

1. Ticket 09 must be complete with communication readers and writers using the canonical organization actor.
2. The catalog query must return zero organizational `users.id` references, with bridge and authentication references explicitly excluded.
3. Runtime legacy-actor telemetry must show zero writes and zero required reads during representative domain tests.
4. Only then may the compatibility bridge be removed and a contract migration be prepared, applied, and verified against cold bootstrap and upgrade paths.
