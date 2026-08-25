# 02 — A calendar event carries its timezone

**What to build:** A meeting shows at the right local time for everyone who sees it, including across offices and across a daylight-saving boundary. Today calendar timestamps are naive with nothing pinning a zone, so a nine o'clock meeting is a different instant in two offices.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] An event stores its instant and its originating zone.
- [ ] An event created in one zone reads correctly in another.
- [ ] An event is correct across a daylight-saving boundary in both directions.
- [ ] An event is correct in a zone with a non-hour offset.
- [ ] Existing events are migrated without shifting.

## Todo

- [ ] Store the zone, not just an offset — the offset changes across DST
- [ ] Test the two DST directions and a half-hour offset zone; this is where hand-rolled logic fails
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
