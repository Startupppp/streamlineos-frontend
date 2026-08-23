# 03 — One answer to "which product is this URL in"

**What to build:** The product a pathname belongs to is derived from the navigation model, with the exceptions written down instead of implied.

`getProductFromPathname` is a 28-branch prefix chain that re-derives, from URL strings, the same fact ticket 01 made a declared field. Two sources for one fact, with nothing keeping them consistent: a route can move product in the nav model and keep reporting its old product to the switcher, the active-product highlight and the sidebar-visibility hook.

It cannot simply be deleted. It answers for paths the nav model does not contain — `/parties`, `/sales`, `/customer-executive`, `/portal` — and for `/` and unknown paths, where it falls back to Home. Those are real cases, and the current chain is where that knowledge lives.

So: derive what can be derived, and make the remainder an explicit, named table rather than branches buried in a chain.

**Blocked by:** 01 — A nav group declares its product.

**Status:** ready-for-agent

- [ ] A pathname resolves to a product by **longest-prefix match over the navigation model**, so a route that moves product moves its URL's answer with it.
- [ ] Paths the nav model does not cover are listed in one named table with a one-line reason each. A reader can see every exception at once.
- [ ] The fallback for an unknown path stays Home, and is stated rather than being the last line of a chain.
- [ ] A test asserts the derived answer equals today's answer **for every path the existing tests already cover** — the equality that makes this safe. `sidebar-nav-items.test.ts` already pins around 30 of these; they pass unchanged.
- [ ] A test asserts every entry in the exception table is genuinely absent from the nav model. An exception that stops being needed is dead weight that will outlive the reason for it.
- [ ] The prefix chain is deleted, not left beside its replacement.
- [ ] `/portal` keeps its current split — the two portal paths that answer Home still answer Home.
- [ ] Verified by running the app: deep-linking to a route in each product activates the right product in the switcher and renders that product's sidebar.
