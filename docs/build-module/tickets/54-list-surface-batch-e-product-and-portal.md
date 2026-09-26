# 54 — Batch E: the managed-product and portal lists adopt the surface

**What to build:** The managed-product lists — products, product projects, goals, feedback, insights, roadmap — and the client-facing portal lists render through the list surface. This is the last batch, so it also removes whatever remains of the old assembly for pages now fully migrated.

The portal pages carry the extra constraint: an external client's list must never show a control or a column the client cannot have, and its empty state must not disclose that filtered-out rows exist.

**Blocked by:** 49 — A Build list surface exists, and a list can be rendered without fetching.

**Status:** ready-for-agent

- [ ] Each managed-product and portal list renders through the surface
- [ ] A portal list shows no internal-only column or control, and its empty state discloses nothing about excluded rows
- [ ] No page in the batch changes visibly for either actor kind
- [ ] Any remaining shared assembly helper with no callers left is deleted
- [ ] Each page's rows can be supplied as props
