# StreamlineOS domain glossary

## Chat

**Chat event**: a realtime notice about a conversation (message created/updated/deleted, reaction changed, huddle started/ended/joined, user notification). Only the server emits chat events, through the chat events module; clients only subscribe. Each kind has one zod schema.

**Durable chat event**: a chat event that creates a row people must see (user message, system message). Published right after commit, with the outbox as a backstop; clients refetch on reconnect so nothing depends on the outbox running.

**Typing**: Ably presence state on the conversation's channel, not a chat event.

**Huddle**: an external Google Meet or Microsoft Teams meeting started from a conversation through the starter's primary Composio calendar connection. StreamlineOS keeps only the join link, starter, provider, invites and active status; the meeting owns chat, video and moderation.

**Linked record**: a record from another module (Build ticket/project, CRM client/deal/lead, …) referenced by type and id, resolved and access-checked through an entity adapter.

**Record conversation**: the conversation attached to one linked record, embeddable on that record's module page.

## Docs

**Page access**: the single decision of what an actor may do to one page (view, comment, edit, manage). Every surface — open, edit, restore, visibility, export, search, Ask, preview — asks it; no caller re-derives it.

**Page head**: the fixed set of page facts page access returns with its decision (id, space, status, lock, trashed state, visibility, owner, content and ACL revisions). Callers load content separately by id.

**Capabilities**: the `can` set (view, comment, edit, manage) page access computes for one actor and page; the frontend renders from it instead of re-deriving permissions.

**Readable pages**: the set-shaped form of page access — a predicate lists, search and Ask filter by, built from the same rules as page access.

**Actor standing**: who the actor is for Docs purposes (membership, roles, admin flags, reachable spaces, permissions version). Cached across requests and keyed by ACL revision; page decisions are not.

**Owner**: the member who controls a page's sharing and visibility through manage access. Ownership can transfer; today the creator still holds manage access alongside the owner.

**Deleter**: the member who moved a page to Trash; may restore it alongside anyone with manage.

**File**: what a person sees in Docs — a page of kind `document` (rich text) or `spreadsheet` (workbook). Code still calls it a page.

**Spreadsheet**: a page of kind `spreadsheet`. Its content is a **workbook** of ordered **sheets**, each a sparse set of **cells** stored one row per cell, not a JSON blob on the page.

**Workbook operation**: one change a save sends — add, rename, move or delete a sheet, set its config, set or clear cells. Every operation names a sheet of the page being saved; a save is all operations at one expected content revision.

**Team folder**: what the UI calls a space. Folders do not nest; the **folder tree** is the page tree inside one team folder.

**New menu**: the single create menu (document, spreadsheet, team folder, upload, import, template) used everywhere Docs offers creation.

