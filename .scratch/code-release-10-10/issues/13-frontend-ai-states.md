# 13 — Frontend AI states: exhaustion, queueing, cancellation, retry, partial output, citations

**What to build:** Every AI surface in the UI handles its failure and boundary states explicitly, and none of them issues a duplicate request while doing so.

**Blocked by:** 11.

**Status:** ready-for-agent

- [ ] Credit exhaustion, queueing, streaming, cancellation, retry, partial output, citation loading, provider failure and permission revocation each render a defined state.
- [ ] No state transition issues a duplicate request — in particular, retry after a partial stream must not re-dispatch a paid call already in flight.
- [ ] Cancellation from the UI reaches the backend and stops the spend; an abandoned stream is not left running.
- [ ] AI usage metadata is returned and rendered on the surfaces that consume metered endpoints.
- [ ] Query hooks pass the abort signal in the correct argument position. A signal placed in the params slot type-checks and passes every gate while cancelling nothing.
- [ ] Loading, empty, error, offline and permission-denied states are covered, and StrictMode double-invocation does not double-charge.
