# 01 — Turning a calendar source off keeps it off

**What to build:** A person can turn a calendar source off — interviews, travel, birthdays, leaves — and it stays off across sessions and devices. A source they turned off is never loaded, so hiding events also makes their calendar faster. A source they cannot see because their organisation disabled the module, or because they were individually denied it, is not offered as a switch at all.

The registry already publishes the list of sources with their keys, labels and owning modules. This ticket adds the missing half: storing the choice and applying it before anything loads.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A person's disabled sources persist across sessions and are theirs alone — another person in the same organisation is unaffected.
- [ ] A disabled source is never invoked, not loaded-then-filtered.
- [ ] A source with no stored preference is on, so a newly added source arrives enabled without anyone touching a switch.
- [ ] The toggle list offers only sources the person can actually see — module availability is applied before the toggle list is built, not after.
- [ ] A stored preference naming a source that no longer exists is ignored rather than rejected.
- [ ] The preference is a normalised row per person, per organisation, per source key — never an array on a user record.
- [ ] Reading and writing preferences is tenant-scoped and permission-checked like any other endpoint.

## Todo

- [ ] Add the preference table with the tenant column leading its composite index, following the existing schema conventions
- [ ] Generate and apply the migration; reconcile the snapshot afterwards if a custom migration was used
- [ ] Apply the preference filter inside the registry immediately after the availability filter, so ordering delivers the "no switch for what you cannot see" behaviour for free
- [ ] Add the read and write endpoints with their permission gates and catalog entries on both sides
- [ ] Assert the disabled source's `load` was never called — not merely that its events are absent
- [ ] Confirm the availability comment in the registry survives; it records why availability is per-person, not per-org
- [ ] Boot the API and toggle a real source end to end
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
