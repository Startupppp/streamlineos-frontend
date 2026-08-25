# 23 — The extractor sees one message at a time, and two channels are not one message

**Status:** not started
**Track:** B — channels (discovered by ticket 12's evals)
**Blocked by:** —
**Related:** 22 (the other below-seam finding)

## Why this ticket exists

It was not in the plan. Ticket 12's per-channel gates were built to find out
whether an extractor tuned on email degrades elsewhere. It does, and two of the
reasons are structural rather than a matter of prompting.

**A WhatsApp burst cannot be recovered message by message.** Five fragments that
are one decision, and not one of them carries it. `processActivity` takes a
single activity id and never sees the neighbours, so no prompt change reaches
this. The eval asserts it directly — when thread context lands, that test goes
red and the threshold must be raised on purpose.

**`hasEligibleContext`'s 20-character floor is an email-shaped assumption.** Two
of those five fragments never reach a model at all. What currently prevents "go
ahead" from advancing a deal is a length check written for mail, not a judgement
about whether the message means anything. That is worth knowing before anybody
lowers it — the floor is doing safety work it was never designed for.

**A date split from its request is silently lost.** "Can you send the quote" then
"by Friday" in the next message: the deadline is not invented, so the
no-invented-date gate stays green while the date goes missing.

## Acceptance criteria

- [ ] Extraction can see a thread, not only an activity — the neighbouring
      messages on the same `providerThreadId` within a bounded window.
- [ ] The window is bounded by both count and time, and both are stated with the
      reason. An unbounded thread is an unbounded prompt and an unbounded bill.
- [ ] **Replacing the length floor is part of this, not a follow-up.** Once a
      fragment is judged with its neighbours, `hasEligibleContext`'s 20-character
      rule is doing the wrong job; whatever replaces it must be a judgement about
      meaning, and the safety it currently provides by accident must be provided
      on purpose.
- [ ] A deadline stated in a later message attaches to the request in an earlier
      one.
- [ ] The eval assertions that currently pin these as *impossible* go red and are
      re-pinned at the new rates, deliberately.
- [ ] Cost is measured, not assumed: a thread-shaped prompt is larger than a
      message-shaped one on the busiest channel we have.
- [ ] Email is unaffected — the baseline suite must still hold its own
      thresholds, or the change has been paid for by the channel that works.

## Notes

This is below the ingress seam, like ticket 22. Both were found by adapters and
evals that deliberately refused to reach below it, which is the seam working as
intended: the finding surfaced instead of being patched around in three places.
