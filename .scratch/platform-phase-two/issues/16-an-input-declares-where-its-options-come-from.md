# 16 — An action input declares where its options come from

**What to build:** The missing half of the action declaration. An action already says it needs a person; it cannot say *which* people.

`EntityActionInput` is `{ name, kind, required, choices? }`. `choices` serves the `choice` kind. Nothing serves `user`. So Build's assign action declares `{ name: "assigneeId", kind: "user", required: true }` and a client rendering that declaration has no way to know the valid answers are **the ticket's project members** — not the whole organisation.

That gap is why tickets 04 and 09 are still open. A generic form built on today's declaration would offer everyone in the org, the adapter would refuse the submission, and a working screen would have been traded for a checkbox. Deleting the dialogs to satisfy a criterion would remove capability, which is a mistake this codebase has recorded before.

Once an input can name its option source, a declaration-driven form is safe to build, the two bespoke dialogs can go, and adding an action to any module stops needing client work.

**Blocked by:** None — can start immediately.

**Status:** DONE — one criterion lands with ticket 04, recorded below

- [x] `EntityActionInput.options` is an `EntityActionOptionSource` naming a reference.
- [x] The Build adapter derives the project from the ticket in `owningProjectIds`. The client never supplies it — a caller that could name the source could widen it.
- [x] Emitted for every `user` input on a resolved ticket, in one batched ticket→project query rather than one per reference.
- [x] `options` and `optionsFor` are both optional. CRM declares neither and its suite passes untouched.
- [x] `useEntityActionOptions(channelId, source)` posts the declared reference to `POST /chat/entity-actions/options`; the seam dispatches by type.
- [ ] ~~The person case reuses the existing shared person picker.~~ **Not met here.** The hook returns candidates; nothing renders them yet, because the form that would is ticket 04. Stated rather than quietly counted as done.
- [x] Asserted — and it found a live defect. See below.
- [x] Unreadable project, wrong reference type, non-numeric id and disabled module all yield `[]`.
- [x] Types check; 61 entity tests and 40 chat e2e tests pass.

## Why this is its own ticket

It changes the seam's public type, both adapters and the client. Folding it into ticket 04 or 09 would have hidden a design change inside a wiring task — which is how ticket 14 came to be closed with the wrong gate still live on the client.

## What it unblocks

- **04**, criterion 8: the client renders text, date, user and choice inputs from the declaration.
- **09**, criterion 3: the bespoke assign and due-date dialogs are deleted once nothing imports them.

## Result — the agreement test found a live defect

Criterion 7 asked for a test that an input's declared options and the adapter's own validation agree. Writing it showed they did not.

`assign` validated only that `assigneeId` was a non-empty string. It never checked the assignee belonged to the ticket's project — while the dialog has only ever offered project members. So submission accepted anyone the picker would never have shown, including a user from another organisation, who would then hold a ticket they cannot open: Build's read scoping is project-membership based.

That is a bug rather than a capability, so `assign` now validates the assignee against the same set the option source offers. Mutation-checked: remove the check and the agreement test fails.

**Unblocks:** ticket 04 criterion 8 and ticket 09 criterion 3. Both are now buildable; neither is built.
