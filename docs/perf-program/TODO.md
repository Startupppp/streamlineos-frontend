# Perf & cleanup program — 2026-10-22

Scope: HRMS (`/hr`, `/me`), Build, Home (`/dashboard`, calendar, chat, inbox, mail), Documents/KB + Ask OS (`/knowledge`).
Baseline: root `3d8b74aea` · backend `ff2f38e51`. Commit locally per wave, never push.

## Phase 0 — rules & foundation
- [x] React Compiler on (`reactCompiler: true`, `babel-plugin-react-compiler`)
- [x] Strict react-hooks lint extended to all in-scope paths
- [x] FE-114 rewritten for the compiler; FE-143..147 added (dup keys, per-page loading, fast load, pagination, access)
- [x] BE-158..160 added (dup keys, cache + invalidation, efficient queries)

## Phase 1 — audit (8 lanes, ledgers in this folder)
- [ ] L1 HRMS frontend
- [ ] L2 HRMS backend
- [ ] L3 Build frontend
- [ ] L4 Build backend
- [ ] L5 Home frontend + backend
- [ ] L6 Docs/KB + Ask OS frontend + backend
- [ ] L7 Shared layout/sidebar/nav/hooks used by in-scope modules
- [ ] L8 Per-page loading.tsx inventory across all in-scope routes

## Phase 2A — backend fixes
## Phase 2B — frontend fixes
## Phase 3 — verification
- [ ] Backend tsc · lint · focused jest
- [ ] Frontend type-check · lint · knip · focused jest · next build
- [ ] Unwired-module sweep · RBAC gate parity
- [ ] Local commits (root + backend)
