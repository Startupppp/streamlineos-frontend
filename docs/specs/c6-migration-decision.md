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

The safe retirement condition is all of the following:

1. every organisation's preview reports `willMigrate = 0`;
2. the article-creation surfaces are disabled or explicitly retained as a
   documented conversion-tool workflow; and
3. a final preview is captured with the deployment/change record.

Until those conditions hold, `article-conversion/` is retained and must not be
deleted.

## Permission namespace

The two products deliberately keep the existing `kb:articles:*` and
`kb:pages:*` namespaces. They describe different resources and are already
used by the corresponding controllers. Splitting or renaming them would
invalidate persisted grants and require a permission backfill without adding
security value, so no namespace migration is justified.
