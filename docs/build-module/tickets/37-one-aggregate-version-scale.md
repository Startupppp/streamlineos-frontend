# 37 — One version scale for ticket events, so a consumer cannot permanently skip one

**What to build:** Every consumer of ticket status events keeps processing them. Two producers emit the same event type on the same aggregate with version numbers twelve orders of magnitude apart — one uses the row's version, the other a millisecond timestamp — and the consumer's ordering guard only applies an event whose version exceeds the highest it has already completed. So once a timestamp-scaled event is recorded, every row-scaled event for that ticket is skipped forever, with no error and no retry.

Fixing the producers is not enough on its own: the watermark rows already written at timestamp scale keep the skip alive for every ticket they cover. Those rows need remediating in the same change, and that is the part most likely to be forgotten.

**Blocked by:** 36 — Every ticket write maintains the concurrency token, and no write touches a deleted row.

**Status:** ready-for-agent

- [ ] Both producers of the ticket status event emit the same version scale, derived from the row
- [ ] A test asserts the two producers agree, and fails if either scale changes
- [ ] Existing consumer watermarks recorded at the wrong scale are remediated so affected tickets resume
- [ ] The remediation is idempotent and safe to replay
- [ ] Any other aggregate type sharing this pattern is either fixed or recorded as out of scope with its reason
