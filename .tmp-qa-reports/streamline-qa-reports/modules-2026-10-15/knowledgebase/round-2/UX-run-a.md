# Knowledge Base — Round 2 UX notes (QA1015R2)

## Must change
- Space create: a blank Description still sends null and blocks Create with a raw message (KB-B-026); Name-only create cannot succeed. Make optional fields optional end-to-end.
- Move page: success looks like failure (contract error, dialog stays open, sidebar not updated) — KB-B-029.
- Wiki-level crash: Templates and Space detail replace the whole Wiki view with "Something went wrong" and remove the sidebar (KB-B-030, KB-B-031, KB-B-025). Scope error boundaries to the content pane.
- Trash purge: content pages fail with a generic "Something went wrong on our end" and the row stays (KB-B-028). Show the reason and a retry path.
- Search: 200-character limit not shown; long paste crashes the view (KB-B-012).
- Exe upload: raw MIME "application/x-msdownload" shown to users (KB-B-007 PARTIAL). Show allowed types.
- Version history: only one version after many saves and a publish (KB-B-009).
- Space detail breadcrumb omits the space for pages created from a space (KB-B-003 PARTIAL).

## Good to have
- Space cards created without an icon show no icon; offer a default icon.
- Breadcrumb should show the space name.
- Insert-and-format popover closes when its own button is clicked again.
- Inserted images cap at column width with max height (KB-B-008 still 662 px wide).
- Ask KB Sources: de-duplicate, hide pages with no readable body (KB-B-027).
- Search empty state: suggest prefix/whole-word hint (KB-B-013).
- Quick find (Ctrl+K) should not hijack the editor's link shortcut (KB-B-032, to verify).
- Skeleton waits of 5–20 s on Space detail, Trash and imported pages (KB-B-017).
