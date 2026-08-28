# 27: Build the shared server route-access registry

**What to build:** Server layouts and every navigation surface derive route visibility and access from one permission/module registry with an explicit universal-route allowlist.

**Blocked by:** 03 — Enforce the organization and module authority matrix.

**Status:** ready-for-agent

- [ ] Route metadata represents module, permission and universal status once.
- [ ] Server authorization and desktop/mobile navigation consume the same registry.
- [ ] Unknown/non-universal routes fail closed.
- [ ] Coverage tests detect missing, conflicting and frontend-only permission keys.
