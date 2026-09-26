# Wave-B-07 requests

## R1 — Register retention in settings-gallery.tsx

`frontend/app/(public)/design-system/settings-gallery.tsx` (or equivalent gallery file) likely lists every settings page. Add an entry for the retention settings page so it appears in the gallery.

This file is in the protected list (`app/(public)/design-system/**`) so Wave-B-07 cannot touch it.

## R2 — Apply migration 1295 before shipping

`backend/migrations/1295_build_project_retention_settings.sql` is journalled but unapplied. The backend service will return 404 until the migration runs against the production database. Apply it via `streamline_admin` IAM auth per the standard IAM apply procedure.

## R3 — Journal entry for migration 1295

Confirm `backend/migrations/meta/_journal.json` has an entry for `1295_build_project_retention_settings`. Wave-B-07 cannot touch `_journal.json` (protected file). If the entry is missing, add it with the correct `idx`, `when`, and `tag`.
