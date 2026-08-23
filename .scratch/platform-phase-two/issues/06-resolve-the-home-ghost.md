# 06 — Stop cataloguing four namespaces against a module that exists nowhere

**What to build:** A resolution to the `home` namespace mapping.

A decision was made to administer the communication surfaces together rather than three times over — chat, mail, calendar and notifications routed to one administering module, `home`. That ladder was built, and days later deliberately retired on the rule that Home is universal. The map was left behind.

So today the platform's answer to "who administers a chat permission" is a module that appears in no catalog, has no access keys and has no screen. That answer is written into the permission catalog's module column on every sync, for every chat, mail, calendar and notification permission in the product.

**Blocked by:** 02 — One registry declares what a module is.

**Status:** ready-for-agent

- [ ] One of the two outcomes is chosen and the choice is recorded with its reason:
  - `home` becomes a registry entry with a **universal** ladder, administering the chat, mail, calendar and notification namespaces — the catalog's module column then names a module that exists, and the grouping decision that was deliberately made is preserved; **or**
  - `home` is removed from the map, and those four namespaces administer themselves.
- [ ] A test asserts **every permission key's administering module exists in the registry**. This is the assertion that would have caught the ghost, and it is the most valuable single test in this stream.
- [ ] The permission catalog sync is re-run and the stored module column matches the registry.
- [ ] The change is verified against **existing grant rows**, not assumed. No grant already stored loses its meaning.
- [ ] Requesting an access surface for a universal module still returns not-found. Universal means ungated, not laddered — a member default is revocable, a platform-core guarantee is not.
- [ ] Chat, mail, calendar and notification permissions remain grantable from the organization roles screen.
- [ ] No module key is renamed. Renaming one would break every grant already stored against it.
