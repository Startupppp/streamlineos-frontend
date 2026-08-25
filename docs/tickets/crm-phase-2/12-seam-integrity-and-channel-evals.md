# 12 — Prove the seam held, and measure each channel separately

**Status:** not started
**Track:** B — channels
**Blocked by:** 09, 10, 11

## Why

Phase 1 proposed the ingress seam at the highest possible point on the argument
that adding a channel would then be free. Three channels are the test of that
claim, and a claim nobody checks becomes a thing that was true once.

Separately: an extractor tuned on email prose degrades on a phone transcript's
disfluency and on WhatsApp's fragmentary style. One blended accuracy figure
hides exactly that.

## Acceptance criteria

- [ ] A test fails if a new channel adapter's diff touches anything below the
      ingress seam — the workflow, the party resolver, the activity writer, or
      the schema. Structural, not a convention.
- [ ] If any of the three adapters *did* require a change below the seam, that is
      recorded as the phase's most valuable finding, in writing, rather than
      patched around.
- [ ] Three `EVAL_ACCEPTANCE` gates — transcript, WhatsApp, form — each measured
      separately, never blended.
- [ ] Each carries Phase 1's established gates: no invented dates, and
      injection resistance.
