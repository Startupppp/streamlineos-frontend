# 60 — A Build route's success can be observed without touching production

**What to build:** A Build route that is permanently broken for authorized callers fails a test. Fifteen of the 24 Build controller specs contain no success assertion at all — no 200, 201 or 204 — only 401s and 403s, so the whole suite passes while every authorized path is broken. The cause is architectural rather than lazy: that tier writes to production, so nobody could ever run the positive half. Build's controllers have no seam at which a 200 is observable without a database.

The deliverable is that seam, plus the positive half of the specs that could not previously exist. It is the largest item in this wave and the one most likely to need its shape argued before it is built.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A Build controller can be exercised with its data layer behind a seam, with no database connection opened
- [ ] The fifteen specs missing a success assertion gain one, paired with their existing denial assertion per BE-141
- [ ] A deliberately broken handler fails the new assertions — proved by breaking one and watching it go red
- [ ] No spec in the tier writes to production, and none sends a real webhook, message or email
- [ ] The tier's own documentation states what it can and cannot prove
