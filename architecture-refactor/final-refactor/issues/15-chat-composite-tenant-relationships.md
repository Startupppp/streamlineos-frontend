# 15: Enforce Chat tenant parent relationships

**What to build:** Channels, messages, attachments, pins, huddles and participants cannot reference a parent belonging to another organization.

**Blocked by:** 06 — Expand the OrganizationActor compatibility seam.

**Status:** ready-for-agent

- [ ] Every Chat parent/child edge uses a composite tenant foreign key.
- [ ] Participant relationships use active organization membership for authority.
- [ ] Existing rows pass pre-constraint integrity reporting and repair.
- [ ] Cross-tenant insert/update and representative Chat runtime tests pass.
