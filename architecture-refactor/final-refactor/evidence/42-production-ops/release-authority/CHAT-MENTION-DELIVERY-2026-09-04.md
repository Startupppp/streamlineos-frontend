# Chat mention delivery — the last code-level P1, measured and resolved

**2026-09-04.** Settles the named blocker for PRD-C021, PRD-C127, PRD-C132 and PRD-C160.

## What was recorded before this run

The release record carried exactly one open code-level P1:

```
Alex should receive exactly 1 mention, got 0
@everyone notified nobody — the send path never expands it
```

That text had been quoted forward through several audits. **It was stale.** Two changes landed earlier
on 2026-09-04 and nobody had re-run the probe against them, so no measurement of the current code existed.

## The three defects, and which was which

Only one of the three was in product code.

| # | Defect | Where | Class |
|---|---|---|---|
| 1 | `dispatchRealtime` never published the mention notification | `chat-message-fanout.service.ts` | **product** |
| 2 | The probe subscribed to an unprefixed Ably channel, so it could not have observed a correct publish | `verify-chat-mention-delivery.mjs` | probe |
| 3 | The `@everyone` observation window was 6 s — shorter than the fan-out | `verify-chat-mention-delivery.mjs` | probe sensitivity |

Defect 1 was fixed by publishing through `ExternalEffectLedger.execute` under effect key
`"${idempotencyKey}:mention_notification"` — the same key `dispatchDeferred` uses, so the two paths
cannot double-send.

Defect 2 matters more than it looks. Ably channels are **cell-prefixed**, and
`frontend/lib/ably-channels.ts` subscribes cell-prefixed. An earlier attempt removed `cellPrefixed`
from `AblyService.publishToUser` and `createChatTokenRequest` so the probe would agree with the
product — that change would have made the probe pass **while breaking notification delivery for every
real user**. It was reverted to byte-identical with `HEAD` and the probe was corrected instead.
The rule this proves: when a probe and the product disagree, the probe is the suspect first.

Defect 3 is a sensitivity change, not a weakened assertion. A timeout and a non-delivery are different
findings, and a 6 s window could not tell them apart. The window is now 15 s; the assertion is unchanged.

## Result

Command (`API_URL` = the live API on :1501, `CHAT_PROBE_DATABASE_URL` = `scratch_boot_d` on the
disposable Neon branch — the probe seeds *and deletes* an organization and has no scratch-name guard,
so the target is named explicitly rather than inherited from `.env`):

```
node --env-file=.env src/scripts/verify-chat-mention-delivery.mjs
```

Two consecutive runs, each against a freshly seeded organization:

| Observation | Run 1 | Run 2 | Required |
|---|---|---|---|
| `POST` message | 201 | 201 | 201 |
| Explicit `@alex` → Alex | 1 | 1 | exactly 1 |
| Explicit `@alex` → Alexander | 0 | 0 | 0 — the prefix must not over-match |
| `@everyone` → Alex | 1 | 1 | ≥1 |
| `@everyone` → Alexander | 1 | 1 | ≥1 |
| `chat_messages` rows | 2 | 2 | 2 |
| Exit code | **0** | **0** | 0 |

```
PASS — the mention reached exactly the person named.
```

The Alexander column is the part worth keeping: `@alex` reaching Alexander would be a substring
over-match, and `@everyone` *not* reaching Alexander would be a roster-expansion failure. Both
directions are observed, so the pass is not one-sided.

## Verdict

**The last code-level P1 is resolved by measurement, not by inspection.** The environment was a
production build against a cleanly bootstrapped database at migration head 685/685 with the
application-role grants applied.

Product code was changed only for defect 1. No assertion was weakened, no ceiling moved.
