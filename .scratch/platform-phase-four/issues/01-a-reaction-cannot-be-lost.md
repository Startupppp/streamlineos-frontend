# 01 — Two people reacting at once do not overwrite each other

**What to build:** Reaction toggling that survives concurrency.

`toggleReaction` reads `chat_messages.reactions`, computes the next value in JavaScript, and writes the whole object back (`chat-messages.service.ts:571-601`). Two people reacting to the same message in the same moment both read the same snapshot, both compute from it, and the second write erases the first. The reaction simply disappears, with no error anywhere.

Reactions stay `jsonb`. They are always read with their message, never queried or paginated independently, and are bounded — the §3 warning about JSONB is about data that needs indexing, pagination or soft delete, and this is none of those. The defect is the unguarded read-modify-write, not the column type.

**Blocked by:** None.

**Status:** DONE — row lock + `chat-reactions.ts` pure toggle, 8 tests.

- [x] Two concurrent toggles on the same message cannot lose one another.
- [x] The one-reaction-per-person rule is preserved exactly: reacting with a second emoji replaces the first rather than adding to it. That rule is only visible by reading the code today, so it gets a test.
- [x] Toggling the same emoji twice removes it, and removing the last reactor drops the emoji key rather than leaving an empty array.
- [x] The toggle decision is a pure function so the rule above is testable without a database.
- [x] The realtime event still carries the reactions the writer actually persisted, not the value it hoped to persist.
- [x] No change to the response shape.
