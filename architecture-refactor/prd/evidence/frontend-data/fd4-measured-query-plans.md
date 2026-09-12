# FD4 — measured query plans, not source inference

> Reference only. Execute [the single completion plan](../../completion-plan.md); historical verdicts below do not assign work or certify current release readiness.
> Dated app-role query plans remain evidence, not current production capacity. Reuse populated fixtures and remeasure changed paths before removing an index or changing search authority.

Measured 2026-09-12 on `scratch_local` (PostgreSQL 18.6, `127.0.0.1:5432`), as
**`streamline_app` with `app.organization_id` set inside the transaction** — never as
`neondb_owner`, which holds BYPASSRLS and would hide the policy cost. `VACUUM ANALYZE`
was run on `users` and `organization_members` first, so these are not empty-table plans.

Dataset: 2 tenants, 501 users, 500 ACTIVE members in
`aaaaaaaa-1111-0000-0000-000000000001`, 25 in the second. This is the "seeded tenant with
realistic membership" FD4 was blocked on — the previous probe found **1** member, where
every plan is trivial.

## What was measured

| # | Path | Buffers | Time | Plan driver |
| --- | --- | --- | --- | --- |
| A | `/org/members` roster, no search, `LIMIT 100` | 36 hit | 1.29 ms | `idx_org_members_org_status` (Bitmap Index Scan) → Hash Join → `users` |
| B | `/org/members` search `%seed%` (matches all 501) | 36 hit | 2.26 ms | same org-led plan |
| C | `/org/members` search `%user-42%` (11 matches) | 56 hit + 2 read | 6.03 ms | **`Seq Scan on users`** → Nested Loop into `organization_members` |

A and B are **bounded by tenant size** and index-driven. That half of the FD4 worry is
answered: the roster and the unselective search are cheap and org-led.

## The real finding is a plan flip, not a slow ILIKE

C is the one that matters. When the search term looks selective, the planner stops driving
from the tenant's members and drives from `users` instead — `Rows Removed by Filter: 490`.

`users` carries **no RLS** (`relrowsecurity = f`; membership is the tenant boundary, not the
user row). So that scan is not fenced to the tenant: its cost tracks the **global** user
count across every organisation, not the caller's 500 members. At 501 users that is 22
buffers and irrelevant. The shape is the finding; the number is not.

**This is not proof of a production problem.** 501 users is too small to show the
divergence. The discriminator is a deployment-scale `users` table, which this environment
does not have.

## Two corrections to the source audit

**The proposed index already exists.** the superseded source audit lists "`users` — GIN
`(name, first_name, last_name, email) gin_trgm_ops`" as a proposal and marks `/org/members`
**REPAIR NEEDED — no trgm index evidence**. Four GIN trigram indexes are already present:

```
idx_users_name_trgm        gin (name gin_trgm_ops)
idx_users_email_trgm       gin (email gin_trgm_ops)
idx_users_first_name_trgm  gin (first_name gin_trgm_ops)
idx_users_last_name_trgm   gin (last_name gin_trgm_ops)
```

**And they are reachable by the app role**, which is the part that could not be assumed —
`backend/CLAUDE.md` §3 records that a text index is unusable under RLS because the search
operator is not leakproof. That rule does not bite here precisely because `users` has no
RLS. Forcing `enable_seqscan = off` on a single-column predicate as `streamline_app`:

```
Bitmap Heap Scan on users   (rows=11)  Buffers: shared hit=14   0.505 ms
  Recheck Cond: (email ~~* '%user-42%')
  ->  Bitmap Index Scan on idx_users_email_trgm   Buffers: shared hit=11
```

So the planner has a working index path at scale and declines it at 501 rows because a seq
scan is genuinely cheaper there. Nothing needs adding.

**Still open, and it is a different question.** With `enable_seqscan = off` the *five-way OR*
did **not** produce a BitmapOr across the four trigram indexes — it chose `users_pkey`.
Whether four single-column GIN indexes BitmapOr'd together beat a seq scan at deployment
scale is unmeasured. One expression index over the concatenated search text would remove
the question; do not add it without the measurement that justifies it.

## `/chat/unread` index coverage — covered, but the comment names the wrong index

The audit asks whether `idx_chat_messages_unread` covers
`(org_id, channel_id, channel_position)`. It does not:

```
idx_chat_messages_unread           (org_id, channel_id, is_deleted, created_at)      WHERE is_deleted = false
idx_chat_messages_unread_position  (org_id, channel_id, is_deleted, channel_position) WHERE is_deleted = false
```

`org_id` leads both, so the org-qualified subquery is covered — by the **second** index.
The source comment points at the first. Coverage is fine; the anchor is wrong.

## New — a trigram index on an RLS table that can never be used

`idx_chat_messages_content_trgm` is `gin (content gin_trgm_ops)` on `chat_messages`, which
**has RLS enabled**. As `streamline_app` with the GUC set and `enable_seqscan = off`, the
planner does not consider it at all:

```
Index Scan using idx_chat_messages_channel_position on chat_messages
  Index Cond: (org_id = current_org_id())
  Filter: (content ~~* '%hello%')
```

The trigram predicate lands as a **Filter**, not an index condition — the documented
non-leakproof-operator behaviour, observed rather than assumed. The index therefore buys no
reads while still costing insert and update amplification. It is a deletion candidate, or
the search belongs behind a `SECURITY DEFINER` id-returning function like
`app.search_ticket_ids` (`backend/CLAUDE.md` §3).

Shape-only: `chat_messages` and `chat_channel_members` hold **0 rows** here, so no cost is
claimed and no `/chat/unread` execution was measured. Empty is unseeded, not unused.

## Limits

- One synthetic tenant; names are uniform (`Seed User <n>`, `user-<n>@scratch-seed.test`),
  so selectivity realism is limited and `%seed%` is a zero-selectivity worst case.
- Chat tables empty — no `/chat/unread`, `/chat/channels` or message-timeline cost measured.
- Planning cost exceeded execution on every run here (509 buffers, 31.6 ms on the first),
  an artefact of the policy and index catalogue at this row count. Do not read it as a
  production planning figure.
- No index was added, dropped or proposed for migration on the strength of these numbers.
