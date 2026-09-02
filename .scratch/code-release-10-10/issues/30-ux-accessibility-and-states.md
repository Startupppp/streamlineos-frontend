# 30 — UX, accessibility and responsive behaviour across authenticated surfaces

**What to build:** The §10.18 UX criteria: every state rendered, every surface keyboard- and screen-reader-navigable, and correct layout at the three reference widths.

**Blocked by:** 28.

**Status:** ready-for-agent

- [ ] Loading, empty, error, offline and permission-denied states are present on every authenticated surface, not only the common paths.
- [ ] Keyboard navigation and screen-reader semantics work on every interactive surface; focus is managed across dialogs, drawers and route transitions.
- [ ] Contrast meets the standard and is verified rather than assumed.
- [ ] Layout is correct at 375, 768 and 1280.
- [ ] Representative browser end-to-end journeys cover the main module flows.
- [ ] Error and offline states are not removed during cleanup merely because they are uncommon in local development.
- [ ] Public metadata is correct without changing landing visuals or animations.
