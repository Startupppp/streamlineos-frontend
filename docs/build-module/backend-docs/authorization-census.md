# Build module — authorization census (pointer)

This file has been replaced with a pointer. The generated census lives at:

`backend/docs/build-module/authorization-census.md`

Regenerate with: `cd backend && pnpm check:build-authz-census`
Generator: `backend/scripts/build-authorization-census.mjs`

This root copy was stale — it still named `build:sprints:view` and `build:sprints:manage` (retired by migration 1197 in favour of `build:cycles:view/manage`) and cited line numbers that had moved. The generator writes only to `backend/docs/build-module/`. The root `.gitignore` hides `backend/` from ripgrep, so a root-level search finds this file first; this pointer exists to send that search to the real copy rather than reading a lie. Do not hand-edit the backend copy; do not make the generator write a second file here.
