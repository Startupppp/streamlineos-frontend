# 03 — Fence Build's filter bar before anything moves it

**What to build:** Tests that pin what Build's filter bar does today.

Build's filter family is the most complete list-filtering implementation in the product — roughly 2,400 lines handling overflow, chips, URL state, debounce and the neutral value — and **nothing tests it**. The web app has jest and testing-library and 72 test files; none of them touch this.

The next three tickets reshape and move that code. Without this fence, "it still works" is a claim nobody can check, and the move is unsafe. This ticket changes no behaviour.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Selecting a filter writes it to the URL, and loading that URL restores the selection.
- [ ] Clearing a filter removes its parameter rather than writing a neutral value into it.
- [ ] Active filters render as chips, and dismissing a chip removes exactly that filter and no other.
- [ ] Clear-all returns the URL to its unfiltered form.
- [ ] Rapid search input settles to one result rather than one per keystroke.
- [ ] More categories than fit produce a bounded bar, with the surplus reachable rather than clipped.
- [ ] A single-valued category replaces its selection; a multi-valued one accumulates.
- [ ] Keyboard navigation opens, moves through and applies a filter without a pointer.
- [ ] Tests drive the bar through its rendered interface — what a user sees and does — not through internal component or hook calls. A test that asserts which internal component rendered will block the very reshape it exists to protect.
