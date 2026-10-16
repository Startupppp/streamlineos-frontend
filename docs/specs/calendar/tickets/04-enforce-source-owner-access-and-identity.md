# 04: Enforce source-owner access and scoped identity

**What to build:** Resolve source-linked details through each owning module's actor-level authorization and make external identities connection-scoped.

**Blocked by:** 03: Expand the Calendar projection contract.

**Status:** accepted

- [x] A user denied a linked Build project or CRM record sees no restricted title, status, link, search hit, export row, notification text, or AI context.
- [x] Authorized users retain the permitted linked summary and deep link.
- [x] External identity is based on connected account plus provider event ID, so matching IDs from two accounts remain distinct.
- [x] Native/external deduplication occurs only through an explicit replica mapping.
- [x] Integration tests cover denied-object access, permission revocation, two-account ID collision, and direct detail access.

