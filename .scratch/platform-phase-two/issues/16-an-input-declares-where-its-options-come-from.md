# 16 — An action input declares where its options come from

**What to build:** The missing half of the action declaration. An action already says it needs a person; it cannot say *which* people.

`EntityActionInput` is `{ name, kind, required, choices? }`. `choices` serves the `choice` kind. Nothing serves `user`. So Build's assign action declares `{ name: "assigneeId", kind: "user", required: true }` and a client rendering that declaration has no way to know the valid answers are **the ticket's project members** — not the whole organisation.

That gap is why tickets 04 and 09 are still open. A generic form built on today's declaration would offer everyone in the org, the adapter would refuse the submission, and a working screen would have been traded for a checkbox. Deleting the dialogs to satisfy a criterion would remove capability, which is a mistake this codebase has recorded before.

Once an input can name its option source, a declaration-driven form is safe to build, the two bespoke dialogs can go, and adding an action to any module stops needing client work.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `EntityActionInput` can describe where an input's options come from, in the same spirit `choices` already does for the `choice` kind — but able to name a reference, not just a literal list.
- [ ] The shape covers the case that motivated it: "people who are members of *this* project", where the project is derived from the record being acted on, not passed by the client.
- [ ] The Build adapter emits it for `assign`. It already resolves the ticket, so it already knows the project — the client must not have to supply it.
- [ ] An adapter that declares no option source still works: the input renders with a sensible default and nothing regresses.
- [ ] The client can resolve an option source to a list without knowing which module produced it.
- [ ] The person case reuses the existing shared person picker rather than introducing a second one.
- [ ] A test asserts an input's declared options and the adapter's own validation agree — offering a candidate the adapter would refuse is the same class of defect as discovery offering an action submission refuses, which is already pinned.
- [ ] Cross-tenant and unreadable references yield no options rather than an error, matching how the seam already treats resolution.
- [ ] Types check; the adapter specs and the chat entity-action e2e specs pass unchanged.

## Why this is its own ticket

It changes the seam's public type, both adapters and the client. Folding it into ticket 04 or 09 would have hidden a design change inside a wiring task — which is how ticket 14 came to be closed with the wrong gate still live on the client.

## What it unblocks

- **04**, criterion 8: the client renders text, date, user and choice inputs from the declaration.
- **09**, criterion 3: the bespoke assign and due-date dialogs are deleted once nothing imports them.
