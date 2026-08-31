# 30: Decompose the Chat frontend architecture

**What to build:** Chat separates channel, message, thread, reaction, huddle and unread data/state/presentation so changes are independently testable and rerenders stay bounded.

**Blocked by:** 14 and 15.

**Status:** ready-for-agent

- [ ] Oversized Chat components and API hooks are split by cohesive responsibility.
- [ ] Permission-aware actions remain exact and backend-authoritative.
- [ ] Message ordering, drafts, reactions, unread state and realtime behavior are preserved.
- [ ] File-size, render, typecheck and focused Chat tests pass.
