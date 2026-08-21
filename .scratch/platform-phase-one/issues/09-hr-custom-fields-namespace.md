# 09 — HR custom fields move to the HR namespace

**What to build:** Four HR custom-field routes are gated on the global custom-fields settings permission. This contradicts an explicit product rule: module-owned surfaces — custom fields, automations, integrations, data-hub import and export — live in each module's settings, never in global settings. As written, an HR owner cannot manage HR's own custom fields without organisation-wide settings authority.

Move those four routes onto HR's namespace.

**Leave the eight organisation-structure routes alone.** Locations and teams under the HR compatibility controller are gated on global organisation settings, and that is correct — organisation hierarchy genuinely is global administration under the same rule. They are named here specifically so they are not swept up by mistake.

**Blocked by:** 05 — Permission key grammar becomes a build failure

**Status:** ready-for-agent

- [ ] The four custom-field routes are gated on an HR permission
- [ ] An HR owner can manage HR custom fields without global settings authority
- [ ] The eight organisation-structure routes remain on global settings permissions, unchanged
- [ ] Existing holders of the global custom-fields permission retain HR custom-field access, or the change is called out as a deliberate reduction
