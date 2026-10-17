# Knowledge Base — Round 2 UX notes (merged runs A + B, QA1015R2)

Deduped Must change / Good to have from run A and run B. IDs refer to the merged BUGS.md.

> Both runs shared one browser session; items marked "observed in shared session" in BUGS.md should be re-verified in round 3.

## Must change
- **Edit space sheet is blank** (KB-B-029): the form does not show the space's name, description or icon. Pre-fill it from the record.
- **Optional space fields break Create/Save with raw schema text** (KB-B-001, KB-B-026, KB-B-029): toasts read `description: Invalid input: expected string, received null` (and icon). Make optional fields optional end-to-end; send empty optionals as omitted; show field-level messages.
- **False "server sent data this screen does not understand" after Create/Save/Move** (KB-B-002 intermittent, KB-B-015 PARTIAL, KB-B-030): the sheet/dialog stays open after the record is saved; users re-submit. Close the sheet/dialog and refetch on 2xx; align response schemas.
- **Wiki-level crash replaces whole view and removes sidebar** (KB-B-031 Templates, KB-B-032 Space detail, KB-B-025 Saved tab): scope error boundaries to the content pane.
- **Share dialog and header disagree** (KB-B-010 STILL OPEN, KB-B-034): dialog marks Private active while the badge says Public; after switching to Public no option is marked active. Drive both from one visibility value.
- **Public link 404s for Draft pages while the UI says Public** (KB-B-035): block Public for Draft with a hint, or serve/explain consistently.
- **Slash menu loses typing and leaves a "/" behind** (KB-B-005, KB-B-033): fix the keyboard flow and strip the `slash_input` node on dismiss/publish.
- **Trash purge of content pages** (KB-B-028): fails with a generic "Something went wrong on our end" and the row stays. Show the reason and a retry path.
- **Search: 200-character limit not shown; long paste crashes the view** (KB-B-012).
- **Duplicate image upload shows an error** (KB-B-006): an in-flight duplicate should be a no-op (no toast).
- **Version history keeps one version** (KB-B-009): add snapshots on save/publish so Restore is usable.
- **New page from a space is not clearly in the space; breadcrumb has no space** (KB-B-003 PARTIAL): set/show space_id on create; show the space in the breadcrumb.
- **Exe upload: raw MIME shown to users** (KB-B-007 PARTIAL): show allowed types instead of `application/x-msdownload`.

## Good to have
- **Owner blank in Page settings** (KB-B-004): default to the creator.
- **Space cards created without an icon show no icon**: offer a default icon.
- **Inserted images render huge (~662 px)** (KB-B-008): cap width/height and add resize handles.
- **No success toast for Restore/Archive of a space** (KB-B-036).
- **Share badge lags the toast by 1–2 s** (KB-B-021 PARTIAL): update immediately from the mutation result.
- **Ask KB Sources**: de-duplicate, hide pages with no readable body (KB-B-027 PARTIAL).
- **Search empty state**: suggest prefix/whole-word hint (KB-B-013).
- **Quick find (Ctrl+K)** should not hijack the editor's link shortcut (observation, to verify in round 3).
- **Insert-and-format popover** closes when its own button is clicked again.
- **Long loading skeletons** (KB-B-017): Space detail, Trash, history and imported pages show placeholders for seconds; show a header from the list payload where possible.
