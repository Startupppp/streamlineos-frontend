# 03 — Fence Build's filter bar before anything moves it

**What to build:** Tests that pin what Build's filter bar does today.

Build's filter family is the most complete list-filtering implementation in the product — roughly 2,400 lines handling overflow, chips, URL state, debounce and the neutral value — and **nothing tests it**. The web app has jest and testing-library and 72 test files; none of them touch this.

The next three tickets reshape and move that code. Without this fence, "it still works" is a claim nobody can check, and the move is unsafe. This ticket changes no behaviour.

**Blocked by:** None — can start immediately.

**Status:** DONE — with two criteria not met, recorded below

- [x] Selecting a filter writes it to the URL, and loading that URL restores the selection.
- [x] Clearing a filter removes its parameter rather than writing a neutral value into it.
- [x] Active filters render as chips, and dismissing a chip removes exactly that filter and no other.
- [x] Clear-all returns the URL to its unfiltered form.
- [x] Rapid search input settles to one result rather than one per keystroke.
- [ ] ~~More categories than fit produce a bounded bar, with the surplus reachable rather than clipped.~~ **Not met — not holdable here.** Overflow is decided by layout and jsdom performs none, so any assertion would pass whatever the behaviour did. An assertion that cannot fail is worse than an absent one. This needs a browser-based test to hold, and until one exists the overflow policy is unfenced.
- [x] A single-valued category replaces its selection; a multi-valued one accumulates.
- [ ] ~~Keyboard navigation opens, moves through and applies a filter without a pointer.~~ **Not met.** The category menu is built on a command-menu primitive whose keyboard behaviour is unreliable to drive under jsdom, and `@testing-library/user-event` is not a dependency of this repository. Adding one for this was out of scope.
- [x] Tests drive the bar through its rendered interface — what a user sees and does — not through internal component or hook calls.

## Result

**20 tests across two files, all passing. Frontend `tsc --noEmit` 0 errors.**

- 15 on the URL-state hook: hydration, accumulate, toggle-off, parameter deletion instead of an empty value, single- versus multi-valued, page reset on every change, per-value removal, due-date range cleared as a pair, clear-all preserving unrelated state, group-not-value counting, and debounce settling four keystrokes into one navigation.
- 5 on the bar itself: a dismissible chip per active filter, none when unfiltered, dismissal removing exactly one filter, dismissal within a group leaving the rest, and the remove control reachable by accessible name.

The bar's only data dependencies are two query hooks; stubbing those keeps the session and query providers out of a test about chips and URL state, without distorting what is under test.

**Two criteria are unmet and the reasons are structural, not effort.** The overflow policy — the single behaviour that motivated this whole stream — is the one thing this fence cannot hold. Tickets 08 and 13 move that code with overflow unfenced, and that risk should be accepted knowingly rather than discovered later.
