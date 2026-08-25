# 03 — Public help-centre pages can be found by a search engine

**What to build:** The public help centre renders its article content server-side, so the pages can be indexed. This is the one surface in the product where server rendering has a payoff beyond perceived speed, and it currently has none.

It needs its own read path. The existing server adapter sends the caller's session token, and these pages have no caller — they are public, identified by the organisation in the URL. Reusing the authenticated adapter here is the obvious mistake.

**Blocked by:** 01 — One person's server-fetched data can never reach another.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Article content is present in the first HTML response and visible with JavaScript disabled.
- [ ] Page titles, descriptions and canonical URLs are rendered as real metadata.
- [ ] The public read path sends no session token and never falls back to one.
- [ ] Only published, publicly-visible articles are rendered — the public path must not widen what the public endpoint already exposes.
- [ ] The organisation in the URL is the only tenant selector, and an unknown or inactive organisation returns not-found rather than an error page.
- [ ] Public responses set appropriate cache headers.
- [ ] Anonymous traffic cannot trigger any AI or embedding work through this surface.
- [ ] A rate limit applies, and it is a real one — a limit whose tier is not configured silently disables itself.

## Todo

- [ ] Add the public server read path; do not extend the authenticated adapter
- [ ] Confirm from the backend what the public endpoint already exposes and render no more than that
- [ ] Render metadata from the article, not from a static template
- [ ] Check the unknown-organisation and unpublished-article cases return not-found
- [ ] Set cache headers and verify them on a real response
- [ ] Confirm the route's rate limit has a matching tier configured, and account for any development multiplier when testing it
- [ ] Load a public page with JavaScript disabled and view source
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
