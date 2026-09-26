# 55 — The visual harness collapses onto the row-taking surfaces, and shares its fixtures with the tests

**What to build:** Seeing a Build list in a browser stops requiring a hand-rebuilt copy of it. 4,149 lines of visual fixture harness live inside the Build feature across twelve gallery files, and the largest authored file in the whole frontend is one of them at 949 lines with an empty interface. It exists because the page modules had no seam that accepts data — you could not hand a risks page eight rows, it fetched — so someone rebuilt the list from its column definitions plus hundreds of lines of literals.

The deletion test says it must not simply go: delete the gallery and the complexity reappears as "no way to inspect overflow and focus order in a browser", a class jsdom cannot cover. But with the surfaces taking rows as props, each gallery entry collapses to a list rendered with a fixture, and the fixtures become shared with the unit tests instead of being a second, drifting copy of the same data.

**Blocked by:** 50 — Batch A. 51 — Batch B. 52 — Batch C. 53 — Batch D. 54 — Batch E.

**Status:** ready-for-agent

- [ ] Each gallery entry renders the real surface with a fixture, not a rebuilt copy of it
- [ ] The fixtures live in one place and are used by both the galleries and the unit tests
- [ ] Every visual case the galleries covered is still reachable in a browser, including overflow and focus order
- [ ] No gallery file exceeds 500 lines, and the total harness size is recorded before and after
- [ ] A gallery entry that no longer matches its page's real props fails to compile
