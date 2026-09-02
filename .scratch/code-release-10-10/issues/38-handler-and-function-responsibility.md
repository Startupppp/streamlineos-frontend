# 38 — Handler and function responsibility across UI and backend

**What to build:** The §2.3 contract. Named handlers own event and transport orchestration; reusable rules live in domain functions rather than in inline closures or meaningless wrapper chains.

**Blocked by:** 36.

**Status:** ready-for-agent

- [ ] Non-trivial UI events and form actions use named, typed handlers whose names express user intent. No inline arrow or function expression appears in a JSX event prop.
- [ ] Handlers delegate validation and state-independent rules to explicitly named domain functions, and do not embed business logic or multi-step mutations.
- [ ] No handler-to-handler chain exists that adds no behaviour.
- [ ] Memoization of a handler is used only where referential identity affects memoization, subscription or effect correctness, and every dependency is verified.
- [ ] NestJS controllers, queue and event consumers, cron entry points and server actions stay thin: validate and authorize at the correct seam, build the command context, invoke one cohesive implementation, map its typed result or error.
- [ ] Business rules, database orchestration and response shaping are not duplicated across handlers.
