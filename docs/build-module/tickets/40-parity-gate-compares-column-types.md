# 40 — The contract parity gate compares against the column, not against its own reflection

**What to build:** The gate that certifies frontend and backend contracts agree stops passing on fields that are wrong on both sides. It accumulates exactly four kinds of finding — missing, optional-on-backend, extra, opaque — by asking whether each required frontend field exists on the backend. It never compares type, format, enum membership or nullability. So two artefacts hand-written from one another agree by construction, and a column dropped from both is invisible: agreement is guaranteed and proves nothing about the database.

Ticket 39 is the live instance. This ticket removes the class. The authoritative third party is the column, so the gate needs the database schema in the comparison, not just the two documents.

The frozen divergence baseline is part of the same problem: stale entries print as a note rather than a failure, so the list can never shrink and is debt nobody is paying. Prune it against source and make it ratchet.

**Blocked by:** 39 — "Hide completed" works for custom statuses.

**Status:** ready-for-agent

- [ ] The gate reports a divergence when a field's type, enum membership or nullability differs from the column
- [ ] A self-test constructs each new finding kind and fails without the check
- [ ] A field absent from both contracts but present on the table is reported
- [ ] A schema that validates nothing stops counting as a validated field
- [ ] The frozen baseline is pruned of entries proven stale and may only shrink from here
- [ ] The gate's output states what it compares to, so a reader knows what a pass means
