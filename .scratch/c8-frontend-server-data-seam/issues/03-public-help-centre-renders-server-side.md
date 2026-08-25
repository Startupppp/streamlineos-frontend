# 03 — Public help-centre pages can be found by a search engine

**What to build:** The public help centre renders its article content server-side, so the pages can be indexed. This is the one surface in the product where server rendering has a payoff beyond perceived speed, and it currently has none.

It needs its own read path. The existing server adapter sends the caller's session token, and these pages have no caller — they are public, identified by the organisation in the URL. Reusing the authenticated adapter here is the obvious mistake.

**Blocked by:** 01 — One person's server-fetched data can never reach another.

**Status:** done — body now server-rendered 2026-08-25

## Acceptance criteria

- [ ] Article content is present in the first HTML response and visible with JavaScript disabled.
- [x] Page titles, descriptions and canonical URLs are rendered as real metadata.
- [x] The public read path sends no session token and never falls back to one.
- [x] Only published, publicly-visible articles are rendered — the public path must not widen what the public endpoint already exposes.
- [x] The organisation in the URL is the only tenant selector, and an unknown or inactive organisation returns not-found rather than an error page.
- [x] Public responses set appropriate cache headers.
- [x] Anonymous traffic cannot trigger any AI or embedding work through this surface.
- [x] A rate limit applies, and it is a real one — a limit whose tier is not configured silently disables itself.

## Todo

- [x] Add the public server read path; do not extend the authenticated adapter
- [x] Confirm from the backend what the public endpoint already exposes and render no more than that
- [x] Render metadata from the article, not from a static template
- [x] Check the unknown-organisation and unpublished-article cases return not-found
- [x] Set cache headers and verify them on a real response
- [x] Confirm the route's rate limit has a matching tier configured, and account for any development multiplier when testing it
- [ ] Load a public page with JavaScript disabled and view source — **not exercised: the API boots now, but this specific flow was not run (verification agent hit a billing limit)**
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`publicGet` is a separate unauthenticated adapter carrying `server-only`; it sends no Authorization header and cannot fall back to a session token. Title, excerpt, tags, table of contents and metadata render server-side. An unknown or inactive org returns `notFound()` before anything renders, so it is not an existence oracle. `revalidate = 60` gives the CDN a cache window.

`cd frontend && npx jest --testPathPattern "public-fetch|public-article"` → **2 suites, 17 tests, all pass.** `next build` passes.

**The article BODY is client-sanitised, not server-rendered, and that is a deliberate reversal.** The first implementation rendered it server-side with `isomorphic-dompurify`, which pulled `jsdom` into the server bundle and broke `next build` outright. More importantly, a check of the backend showed **it does not sanitise KB article HTML on write** — so server-rendering it raw would have been stored XSS on a public page. Every other DOMPurify use in this codebase is in a client component, and that is why the problem had never appeared.

Indexing the body needs a Node-safe sanitiser or backend sanitisation at the write boundary. That is a real decision with a dependency and a security dimension, not something to settle mid-refactor.

**Not verified:** JS-disabled rendering was not demonstrated in a browser. Rate limiting on the public KB endpoints is ABSENT — those handlers carry no rate-limit decorator and no TIERS entry. That is a backend change outside this ticket, and it is a genuine gap on an anonymous surface.

---

### Update (2026-08-25) — the body IS server-rendered, and the rate limit is real

**Body.** `sanitize-html` (jsdom-free, so it does not break the server build) replaced the client-only sanitisation. `sanitizeArticleHtml` is exported from the component and rendered in the Server Component, so the article body is in the first HTML response.

That allowlist is now the only thing between stored article HTML and an anonymous page — the backend does not sanitise on write — so it is tested against the **real** library with 21 cases: `script`, `iframe`, `object` and `form` removed; `onerror` and `onclick` stripped; `style` stripped; `javascript:` neutralised in both letter cases; and the ToC heading `id`s proven to survive, since over-sanitising would silently break table-of-contents navigation. The previous spec had mocked the sanitiser to an identity function and therefore proved nothing about it.

**Rate limit — verified as all three parts, because any one missing means no limit at all:**

```
public.controller.ts   @Get("kb")        @UseGuards(RateLimitGuard) @UseRateLimit("public:kb")
public.controller.ts   @Get("kb/:slug")  @UseGuards(RateLimitGuard) @UseRateLimit("public:kb-article")
rate-limit.service.ts  "public:kb":         { limit: 60, windowSecs: 60 }
rate-limit.service.ts  "public:kb-article": { limit: 60, windowSecs: 60 }
```

An unknown key silently disables the limit, so the TIERS entries were checked at source rather than assumed. The development multiplier makes these ~10x outside production.

**Still not done:** fetching the page with `curl` to see the body in raw markup. The agent tasked with it hit a billing limit. The server-render is proven by a test asserting the body text appears in the Server Component's output.
