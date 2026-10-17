# Knowledge Base — Round 2 UX notes, run B (QA1015R2)

## Must change
- **Edit space sheet is blank** (KB-B-029): the form does not show the space's name, description or icon. Pre-fill it.
- **Optional space fields break Create/Save with raw schema text** (KB-B-001, KB-B-026, KB-B-029): toasts read `description: Invalid input: expected string, received null`. Send empty optionals as omitted and show field-level messages.
- **False "server sent data this screen does not understand" after Create/Save** (KB-B-002, KB-B-015): the sheet stays open after the record is saved; users re-submit. Close the sheet and refetch on 2xx.
- **Share dialog and header disagree** (KB-B-010, KB-B-031): dialog marks Private active while the badge says Public. Drive both from one visibility value.
- **Public link 404s for Draft pages while the UI says Public** (KB-B-032): block or explain.
- **Slash menu loses typing and leaves a "/" behind** (KB-B-005, KB-B-030): fix the keyboard flow and strip the `slash_input` node.
- **Duplicate image upload shows an error** (KB-B-006, KB-B-034): an in-flight duplicate should be a no-op.
- **Version history keeps one version** (KB-B-009): add snapshots on save/publish so Restore is usable.
- **New page from a space is not in the space until the first save; breadcrumb has no space** (KB-B-003): set space_id on create; show the space in the breadcrumb.

## Good to have
- **Owner blank in Page settings** (KB-B-004): default to the creator.
- **Inserted images render at 662 px square** (KB-B-008): cap width/height and add resize.
- **Raw MIME in the .exe error** (KB-B-033): "Type not allowed: qa-test.exe. Allowed: pdf, doc(x), xls(x), ppt(x), csv, txt, zip."
- **No success toast for Restore/Archive of a space** (KB-B-035).
- **Share badge lags the toast by 1–2 s** (KB-B-021): update immediately from the mutation result.
- **Long loading skeletons** (KB-B-017): space detail and history show placeholders for seconds; show a header from the list payload.
