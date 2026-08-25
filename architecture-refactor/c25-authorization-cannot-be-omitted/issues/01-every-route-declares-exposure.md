# 01 — Every route declares its exposure

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Every route is exactly one of public, universal authenticated or permissioned.
- [ ] A global guard denies a route with no classification or contradictory classifications.
- [ ] Universal employee routes remain available and still derive the actor from authentication.
- [ ] The 12 current JWT-only controller files are classified one by one; none is bulk-allowlisted.
- [ ] `backend/CLAUDE.md` describes the new runtime invariant after it exists.
- [ ] Swagger/OpenAPI generation records the classification without exposing production docs.

## Todo

- [ ] Add explicit universal metadata
- [ ] Register the classifier globally
- [ ] Classify current routes with evidence
- [ ] Add the boot-time denial test
