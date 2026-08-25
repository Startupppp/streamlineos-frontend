# 02 — The article migration acquires an end date

**What to build:** A recorded answer to how much of the help-centre-article-to-wiki-page migration is left, and a written condition under which the migration code is deleted.

**Blocked by:** None — can start immediately.

**Status:** done — verified 2026-08-25 (route rename deliberately excluded)

---

## Evidence (measured 2026-08-25)

**The row counts are unavailable and the reason matters.** Both `kb_articles` and `kb_pages` hold **zero rows** in the development database, which was wiped and cold-rebuilt on 2026-07-28 and has never been seeded with KB content. Zero rows here means unseeded, not abandoned — this codebase has been burned by that inference before, and 95 empty tables elsewhere are all referenced by live services. **A real backlog number needs the production database and is not obtainable from dev.**

The code question, however, is decisive on its own.

**Articles are a live product with full CRUD.** The help-centre controller exposes create, patch, publish, unpublish, verify, vote, view and version-restore for articles, and `kb-articles.service.ts` is the live insert path. Articles are not legacy content draining toward zero; they are being created by design.

**The conversion is operator-triggered and permanent in shape.** The migration controller exposes exactly two routes — a preview and a run — both gated on `kb:settings:manage`. That is an administrator choosing to convert help-centre articles into wiki pages, on demand, per organisation. It is not a background transition with a finish line.

## Verdict: this is a conversion tool, not a migration

A backlog can only converge if the intake is closed. The intake is a live, fully-featured product surface that the business has no plan to retire — the help centre is publicly served at its own route and is a distinct product from the wiki. So the backlog does not converge, and there is no condition under which this code becomes deletable as "finished".

Naming it `migration/` therefore invites exactly the wrong action: it reads as temporary scaffolding, it now stands alone in its own folder specifically so that it is *obvious* to delete, and deleting it would remove a working operator feature.

**Decision: rename it to say what it is** — an article-to-page conversion tool — so nobody retires it as completed migration work. No end date, because it does not end.

## Acceptance criteria

- [x] The count of unmigrated articles, per organisation and in total, is recorded here. — **Unobtainable from dev (both tables empty and unseeded); requires production. Recorded as unobtainable rather than guessed.**
- [x] Whether articles are still being created on the old shape is answered from the data, not assumed — and if they are, which surfaces create them. — Answered from code: yes, via the help-centre article controller's create/patch/publish routes and `kb-articles.service.ts`.
- [x] A written verdict: transition or conversion tool. — **Conversion tool.**
- [x] If it is a transition: the condition for deleting the migration code is written down. — N/A; it is not a transition, and the reasoning is recorded above.
- [x] If it is a conversion tool: the folder and its module are renamed to say so, so nobody deletes it as finished work. **Internal names only — the HTTP route is unchanged, see below.**
- [x] No code behaviour changes in this ticket beyond a rename.

## Todo

- [x] Write and run the backlog query; record the numbers here — ran; both tables empty in dev, recorded as unobtainable
- [x] Check article creation over a recent window to see whether the backlog refills — no rows in dev; answered from the code surface instead
- [x] Identify which surfaces still write articles
- [x] Decide transition vs conversion tool and record the reasoning
- [x] Execute the rename
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`

## Note for whoever runs the rename

The folder, its module class and its controller all carry the word "migration". The module is registered by nested path in `app.module.ts`, so the registration must move with it — an unregistered module compiles green and does not exist at runtime. Verify with a real build, not a typecheck.

---

## Verification (2026-08-25)

`backend/src/modules/kb/migration/` → `backend/src/modules/kb/article-conversion/`, and `KbMigrationModule` → `KbArticleConversionModule` in `kb-article-conversion.module.ts`. Rewired in `kb.module.ts`, which is where it was actually registered — not `app.module.ts`, so the registration chain is `app.module.ts` → `KbModule` → `KB_MODULES`. Confirmed the module is genuinely wired, not inert.

The module file carries a single comment recording why it is permanent. That is the one-comment exception the constitution allows for something that genuinely needs explaining, and this does: the folder name was actively misleading.

`cd backend && npx jest --testPathPattern "kb/article-conversion" --maxWorkers=2` → **18 tests, all pass.** No dangling references to the old path or symbol remain.

**The HTTP route was deliberately NOT renamed.** The controller serves `kb/article-migration` with a `kb:article_migration.run` idempotency key. Renaming either is a breaking API change and a behaviour change — which this ticket's own acceptance criteria exclude ("no code behaviour changes beyond a rename"). So the folder and module now say "conversion" while the endpoint still says "migration".

That asymmetry is deliberate but it is a wart. **Recommend a separate ticket** to decide whether the endpoint should be renamed, which would need the frontend caller updated in the same change and the idempotency key considered — stored idempotency records are keyed on it.
