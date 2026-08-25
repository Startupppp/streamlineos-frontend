# c6 migration and namespace decision

Verified 2026-08-26.

## Product split

The frontend product names are `features/help-centre/` and `features/wiki/`; the
backend owns the corresponding `help-centre/` and `wiki/` modules. Routes remain
`/help/:orgId` and `/knowledge/*`. The import-boundary test is the guard against
reintroducing a cross-product dependency.

## Migration decision

The article-to-page code is a conversion tool, not a one-time application
transition. Help-centre articles are a live product and may continue to be
created, so the tool remains under `article-conversion/` until the product
explicitly retires article creation.

The authoritative per-organisation measurement is
`GET /kb/article-migration/preview`. It reports `total`, `byStatus`,
`alreadyMigrated`, and `willMigrate`; the endpoint must be queried for every
organisation before a conversion run. No static count is recorded here because
the tenant database is runtime state and committing a copied number would become
false as soon as an article is created.

The migration corpus is explicitly **published articles only**. Draft and
in-review articles remain in the Help Centre workflow and are not silently
converted by this tool; the preview's `byStatus` field makes that scope visible.

The safe retirement condition is all of the following:

1. every organisation's preview reports `willMigrate = 0`;
2. the article-creation surfaces are disabled or explicitly retained as a
   documented conversion-tool workflow; and
3. a final preview is captured with the deployment/change record.

Because article creation is a permanent supported intake, a zero backlog alone
does not justify deleting `article-conversion/`. The tool is retired only if a
future product decision ends article creation and the final preview is zero;
otherwise it remains as an intentionally monitored conversion/import tool.

## Permission namespace

The two products deliberately keep the existing `kb:articles:*` and
`kb:pages:*` namespaces. They describe different resources and are already
used by the corresponding controllers. Splitting or renaming them would
invalidate persisted grants and require a permission backfill without adding
security value, so no namespace migration is justified.
