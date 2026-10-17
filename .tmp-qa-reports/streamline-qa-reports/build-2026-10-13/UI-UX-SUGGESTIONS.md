# UI/UX suggestions — build-2026-10-13
U-001 | Project header "Log time" | current: link to dead-end "Module not enabled" page | hide when Timesheets is off | Medium
U-002 | Ticket Time Tracking | Stop discards time silently | keep Save after Stop | High (paired with B-008)
U-003 | Calendar view | leaves Build for org calendar with HR/CRM toggles | in-project calendar with ticket due dates | Medium
U-004 | Search box | 256+ chars takes down the view | maxlength + inline message | High (paired with B-005)
U-005 | Create Issue | empty title message differs (blur silent; click says "at least 3 characters") | one consistent required message | Low
U-006 | Ticket Details | icon-only/unlabelled controls; names are values | visible labels bound to controls | Medium
U-007 | Labels/Statuses settings | statuses show internal enums TODO / IN_PROGRESS while board shows "To Do" | show display names | Low
U-008 | Backlog table | column headers not sortable | add sort on ID/Title/Created | Low
U-009 | Table view | Type and Priority cells are icon-only without text/tooltip | add accessible labels | Low
U-010 | Project wizard step 7 | no summary of entries | review card | Low (paired with B-012)
U-011 | Create/Save buttons | disabled whitespace-only states give no hint why | helper text under field | Low
U-012 | Label duplicate | generic "That record already exists." | "A label named X already exists" | Low

## Round 2 (2026-10-13 afternoon)
U-013 | Ticket Activity attach | Hint "Up to 10 files, 2.0MB each" does not list accepted types or say which types are rejected | Show accepted types and per-file result | Low
U-014 | Ticket heading | Shows "Loading..." for long periods after reload (B-020) | Skeleton with timeout and retry | Low
U-015 | Board cards | No visible drag handle on cards; only column handles ("Drag to reorder column") were found; card drag inconclusive | Add card handle, and state keyboard drag instructions in the card menu | Low (needs confirmation)
U-016 | Products nav | Sidebar "Products" links to /build/managed-products; /build/products shows "Page Not Found" | Redirect /build/products to managed-products | Low
U-017 | Create dialogs | Create Portfolio / Create Program / Create Cycle / Create label have no in-flight state (only Cycle and Project block a double submit) | Disable the primary button while pending (same fix as B-014) | Medium (paired with B-014/B-015)
U-018 | Two-tab conflicts | The "changed while you were editing" dialog is clear (Keep / Discard with server vs your value) — keep; add the changed field name in the banner | Low

## Round 3 (2026-10-13 late afternoon)
U-019 | Settings > Users > Invitations row actions | Resend, Copy join link and Cancel are icon-only buttons (aria-label only; no visible text or tooltip). Cancel invitation works (DELETE 200; row shows "Revoked" with "Re-invite" after reload), but the round-2 note said no cancel control existed | Show a visible "Cancel" text button or an overflow menu with labels; refresh the row to "Revoked" right after the 200 | Low
U-020 | Board filters vs display settings | Filters live only in the URL: after Overview → Issues (sidebar) the Priority/Type filters are gone, while the Ordering and Completed settings persist across full loads. Users cannot tell which settings will be kept | Keep the last filter set per project (or show "Filters reset" toast), and state in the Display drawer which settings persist | Low
U-021 | Board at 768 px | Filter controls (Add filter, Hide done, search) overflow the toolbar and are only reachable by sideways scroll (see B-029) | Wrap the toolbar or collapse filters into one "Filter" button under 1024 px | Low (paired with B-029)

## Round 4 (2026-10-13 late afternoon)
U-022 | Calendar "Add to calendar" menu (viewer qaview1012e, no Build access) | "Add ticket due date" is listed; the dialog then says "No projects found. Go to Projects" (the link goes to a Build page the viewer cannot open). Member (Build Member) sees the same menu item but cannot create (see B-033) | Hide "Add ticket due date" unless the user has a Build project with create rights; never show a dead "Go to Projects" link | Low (paired with B-033)
U-023 | Create Issue bottom sheet at 375 px (opened from the board) | Project selector reads "Loading..." for about 2 s and then "Select project" even though the board is QA Project Alpha | Preselect the board's project and show it as the first value | Low
U-024 | Ticket sheet / dialogs at any width | Console warning "Missing Description or aria-describedby for DialogContent" on the ticket sheet and Create dialogs | Add DialogDescription (or aria-describedby) to every dialog | Low (a11y)

## Round 6 (2026-10-13, 375 px pass)
U-026 | Release Notes editor and ticket Activity action row at 375 px (B-059, B-060) | Release editor is 639 px wide inside a 375 px dialog; Activity row "Summarize comments / Handoff / Draft comment" is wider than the screen and scrolls the whole ticket page | Constrain the editor to the dialog width and wrap its toolbar; wrap or collapse the Activity buttons under 640 px | Low (paired with B-059/B-060)
