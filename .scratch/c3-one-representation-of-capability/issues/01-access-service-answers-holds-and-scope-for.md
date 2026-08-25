# 01 — One function answers whether a person holds a permission

**What to build:** A backend service can ask the access service directly whether a person holds a permission key, and at what data scope, without going near the request object. The answer is correct for an org owner who holds nothing explicitly, correct on a route that does not mount the permission guard, and carries the scope rather than discarding it.

This is the *expand* step: the new way ships beside the old one and nothing migrates yet, so nothing can break.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A held key answers yes, and returns the scope it was granted at.
- [ ] An absent key answers no, at no scope.
- [ ] A key held at no scope answers no.
- [ ] **An org owner holding nothing explicitly answers yes, at full scope** — without the caller writing an owner check.
- [ ] A personal access token that does not delegate the key answers no, even when the underlying resolution holds it.
- [ ] The answer is the same whether or not the permission guard ran on the route.
- [ ] No new cache and no new per-request query — resolution goes through the existing warm path.
- [ ] The request-transaction ceiling job stays green and warm/cold parity is unchanged.

## Todo

- [ ] Add the two members to the access service, taking the caller context so owner and token handling live inside the seam
- [ ] Apply the same personal-token delegability filter the authorization path applies, so the new door is not a wider one
- [ ] Confirm the access module is already global so no module imports change
- [ ] Write the five verdict cases plus the owner case and the token case
- [ ] Re-run the resolution-cost spec and the warm/cold parity spec
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
