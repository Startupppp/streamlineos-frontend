# 01 — Wiki text search uses a bounded id probe

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Wiki keyword search uses a SECURITY DEFINER id-only probe owned by the bypass-RLS owner.
- [ ] The organisation comes from the tenant GUC, never a function parameter.
- [ ] Execute is revoked from public and granted only to the app role.
- [ ] The probe takes a hard limit; the caller requests cap+1 and falls back safely at the cap.
- [ ] The caller re-reads ids under RLS and the live visibility predicate.
- [ ] A read-cost budget proves the index plan as the app role.
