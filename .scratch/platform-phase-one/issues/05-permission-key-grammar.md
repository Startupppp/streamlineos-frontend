# 05 — Permission key grammar becomes a build failure, not a convention

**What to build:** The rules state that a permission key is `module:resource:action` with the action drawn from a fixed set of ten verbs. Nothing enforces it, and roughly 137 of 631 keys use an action outside that set.

**The code is right and the rule is wrong.** Those actions are `publish`, `send`, `void`, `transfer`, `reconcile`, `post`, `merge`, `reopen`, `terminate`, `ship` — real domain verbs carrying authority the ten generic verbs cannot express. Forcing `payroll:runs:post` to become `payroll:runs:manage` would *lose* information. Update the rule to permit a domain verb where it carries authority genuinely distinct from the generic set, then enforce what remains enforceable so the next module cannot reintroduce drift.

Also retire `crm:incentives:config`, which exists in the frontend key union with no backing key, so any check against it is false forever.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] A catalog test rejects a key that cannot be parsed into module and resource segments
- [ ] The test rejects a key present in the frontend union with no backing catalog entry — the direction currently unguarded
- [ ] The rules file states the settled grammar, including when a domain verb is legitimate
- [ ] `crm:incentives:config` is removed and any reference to it resolved
- [ ] The 53 two-segment keys are either accepted by the settled grammar or migrated — not left in limbo
- [ ] The one real consequence of arity is covered: granting a write implies the matching read at any key length, including two- and four-segment keys
