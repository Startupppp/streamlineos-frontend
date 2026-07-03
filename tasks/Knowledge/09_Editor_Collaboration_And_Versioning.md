# StreamlineOS Product Bible

# Knowledge Module

# 09_Editor_Collaboration_And_Versioning.md

## Editor Choice

The frontend already includes Tiptap packages:

- `@tiptap/react`
- `@tiptap/starter-kit`
- `@tiptap/extension-image`
- `@tiptap/extension-link`
- `@tiptap/extension-mention`
- `@tiptap/extension-placeholder`
- `@tiptap/extension-text-align`
- `@tiptap/extension-underline`
- `@tiptap/extension-code-block-lowlight`

Use Tiptap for MVP. Do not install another editor unless a blocker is proven.

## Editor Requirements

Blocks:

- Paragraph.
- Headings.
- Bulleted list.
- Numbered list.
- Checklist.
- Quote.
- Divider.
- Code block.
- Image.
- Attachment.
- Link.
- Mention user.
- Mention article.
- Mention business record.
- Callout.
- StreamlineOS record link.
- StreamlineOS saved view link.

Toolbar:

- Bold.
- Italic.
- Underline.
- Link.
- Heading.
- List.
- Checklist.
- Quote.
- Code.
- Image/attachment.
- More menu.

Slash command:

- `/heading`
- `/checklist`
- `/divider`
- `/callout`
- `/image`
- `/file`
- `/link article`
- `/link record`
- `/template`

## Autosave

Rules:

- Debounce saves.
- Save draft silently.
- Show saved/saving/error state.
- Retry failed saves.
- Do not block typing during save.
- Detect conflicts using version or `updatedAt`.
- Use edit lock hints to prevent accidental overwrite.

## Collaboration MVP

For MVP:

- Support comments and mentions.
- Show last edited by.
- Show currently editing indicator only if existing realtime infrastructure can support it cleanly.
- Full live multi-cursor collaborative editing can be post-MVP.

Edit lock behavior:

- Soft lock starts when a user edits.
- Other editors see who is editing.
- Lock expires automatically.
- Lock never blocks admins from emergency restore, but restore is audited.

Post-MVP:

- Yjs or equivalent CRDT.
- Presence.
- Multi-cursor editing.
- Conflict-free concurrent editing.

## Versioning

Create versions when:

- Article is created.
- Article is published.
- User manually saves named version.
- Material content changes after debounce threshold.
- Article is restored from history.
- Article verification changes.

Version metadata:

- Version number.
- Actor.
- Timestamp.
- Change summary.
- Publish marker.

## Restore Behavior

- Restore creates a new version.
- Restore does not erase history.
- Restore requires edit permission.
- Restoring published content sets article to draft unless user has publish permission and chooses publish restored version.

## Sanitization

Store:

- `contentJson`: canonical editor document.
- `contentHtml`: sanitized rendered HTML.
- `contentText`: plain text for search and AI.

Rules:

- Sanitize user HTML.
- Validate image/file URLs.
- No inline scripts.
- No unsafe iframes.
- Only allow embeds from approved StreamlineOS components in MVP.

## Mentions

Mention types:

- User.
- Team.
- Article.
- Record.

Mention behavior:

- User mention sends notification if target can access article.
- If target cannot access article, prompt author to share or cancel mention.
- Record mention creates `knowledge_links` record.

## Comments

Comments must support:

- Article-level comments.
- Optional text selection comments post-MVP.
- Reply threads.
- Resolve/unresolve.
- Mentions.

## Acceptance Criteria

- Editor loads fast.
- Autosave is reliable.
- Draft loss is prevented.
- HTML rendering is sanitized.
- Versions can be viewed and restored.
- Mentions never leak inaccessible article titles or content.
- Edit locks and conflict detection prevent silent overwrite.
