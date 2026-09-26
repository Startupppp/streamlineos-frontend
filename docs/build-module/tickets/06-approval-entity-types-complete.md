# 06 — Make every approval entity type requestable

**What to build:** A user can request an approval for all eight entity types the system supports. Two cannot currently be submitted at all: the form's validation enumerates only six values, so choosing either of the missing two fails validation in the browser before a request is ever sent. The backend already accepts all eight, correctly, by deriving its enumeration from the database.

The frontend should derive from the same generated catalog rather than restating the list by hand.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] All eight approval entity types can be submitted end to end
- [ ] The frontend enumeration derives from the generated enum catalog, not a hand-written array
- [ ] The parallel hand-written type union is derived from the schema rather than maintained separately
- [ ] Adding a ninth value to the database and regenerating the catalog makes it available with no further frontend edit
