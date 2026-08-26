# 02 — A calendar event carries its timezone

**What to build:** A meeting shows at the right local time for everyone who sees it, including across offices and across a daylight-saving boundary. Today calendar timestamps are naive with nothing pinning a zone, so a nine o'clock meeting is a different instant in two offices.

**Blocked by:** None — can start immediately

**Status:** done

## Acceptance criteria

- [x] An event stores its instant and its originating zone. — `migrations/0483_calendar_event_timezone.sql` adds `timezone TEXT NOT NULL DEFAULT 'UTC'` and promotes `start_date`/`end_date` to `TIMESTAMP WITH TIME ZONE`; Drizzle schema at `db/schema/common/shared.ts:221-223` reflects the final state.
- [x] An event created in one zone reads correctly in another. — `calendar-timezone.spec.ts:130-134` asserts a UTC instant reads the correct local time in two different zones.
- [x] An event is correct across a daylight-saving boundary in both directions. — `calendar-timezone.spec.ts:121-145` covers America/New_York spring-forward and fall-back.
- [x] An event is correct in a zone with a non-hour offset. — `calendar-timezone.spec.ts:147-164` covers Asia/Kolkata (+05:30).
- [x] Existing events are migrated without shifting. — `0483` comment documents the lossless cast assumption (existing naive timestamps are UTC).

## Todo

- [x] Store the zone, not just an offset — the offset changes across DST
- [x] Test the two DST directions and a half-hour offset zone; this is where hand-rolled logic fails
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
