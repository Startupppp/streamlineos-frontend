# 12: Chat

**What to build:** Channels, threads, members, messages, reactions, attachments, ordering, unread state, realtime delivery, and UI authorization work at tenant scale.

**Blocked by:** 02 — Schema and executable-key minimization; 04 — API, Zod and OpenAPI contracts; 05 — Authentication, Organization, RBAC and Settings

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C127** — Reconstruct current-head Chat evidence across channel/thread/member/message/reaction/attachment schema, tenant-composite integrity, channel and mutation authorization, scalable ordering/fanout/unread state, bounded history/search, cache/realtime invalidation, offline UI and representative E2E.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.

