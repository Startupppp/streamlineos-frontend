# 04 — Adding a second payment provider costs one adapter

**What to build:** The billing service names no payment provider. The concrete provider service is reachable only from its own adapter. A second provider — for a second geography — becomes one new file implementing the interface and registering itself, with no change to billing.

This is the *contract* step, and it is where the deletion test finally bites: after this ticket, removing the interface breaks the billing service loudly, which it does not today.

**Blocked by:** 03 — Orders and payment signatures go through the seam.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The billing service does not import or inject the concrete provider service.
- [ ] Nothing outside the adapters directory imports it — enforced by a test, not by convention.
- [ ] The same billing flow driven by two different fake adapters produces the same domain outcome with different provider identifiers. **This is the test that proves the seam is real and it is impossible to write today.**
- [ ] Deleting the interface would break the billing service — verify by trying it locally before restoring.
- [ ] Billing tests need no real provider client.
- [ ] The concrete provider service is not deleted; it becomes an adapter implementation detail.
- [ ] Backend suite green; module graph still acyclic; the dead-code baseline is unchanged or improved.

## Todo

- [ ] Remove the concrete provider from the billing service's constructor and confirm nothing else in that file names it
- [ ] Add the import-boundary test
- [ ] Write the two-fake-adapter substitution test
- [ ] Temporarily delete the interface to confirm the build now fails, then restore
- [ ] Run the module-graph check and the dead-code check against the recorded baseline
- [ ] Boot the API and complete one full payment round trip
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
