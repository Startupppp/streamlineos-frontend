# StreamlineOS Product Bible

# Knowledge Module

# 02_Information_Architecture.md

## Core Concepts

## Space

A space is a container for a body of knowledge.

Space types:

- `private`: personal notes for one user.
- `team`: team or department wiki.
- `company`: company-wide wiki.
- `module`: auto-created documentation area for a StreamlineOS module.
- `support`: internal and public support knowledge base.
- `project`: project-specific documentation.

## Article

An article is the primary content unit. It can be a note, SOP, policy, guide, playbook, troubleshooting page, decision record, or help article.

Article visibility:

- `private`
- `shared`
- `team`
- `company`
- `public_help_center`

Article status:

- `draft`
- `in_review`
- `published`
- `archived`

Trust state:

- `unverified`
- `verified`
- `verification_expired`

Article content type:

- note
- sop
- policy
- support_article
- troubleshooting
- decision_record
- meeting_notes
- runbook
- project_brief
- playbook

## Collection

A collection is an optional grouping inside a space:

- Policies
- SOPs
- Onboarding
- Sales playbooks
- Product docs
- Troubleshooting
- Runbooks
- FAQs

## Article Tree

Articles can be nested under parent articles. The tree must support drag-and-drop reorder, keyboard navigation, collapsed branches, and parent/child move operations.

## Template

Reusable starting structure for articles.

Template types:

- Blank note
- SOP
- Policy
- Meeting notes
- Decision record
- Project brief
- Sales playbook
- Support article
- Troubleshooting guide
- HR onboarding guide
- Inventory process
- Incident postmortem

## Knowledge Link

Relationship between an article and another StreamlineOS entity:

- CRM lead, deal, contact, quote
- HR employee, policy, job, candidate, onboarding flow
- Inventory product, warehouse, vendor, PO, SO
- Project, task, sprint, milestone
- Support ticket, customer, SLA
- Accounting invoice, vendor payment, ledger account
- Chat channel, message, huddle

## Navigation Model

Primary left rail inside `/knowledge`:

- New article
- Search
- Ask AI
- Home
- Recent
- Favorites
- Private
- Shared with me
- Workspace
- Team spaces
- Module spaces
- Support KB
- Templates
- Reviews
- Analytics
- Settings
- Import
- Trash

Do not over-nest. Most users should be one click from articles and two clicks from creating content.

## Home Page Sections

Knowledge Home should show:

- Quick actions: New article, Ask AI, Create from template, Import.
- Continue editing drafts.
- Recently viewed.
- Favorites.
- Needs review.
- Suggested knowledge gaps.
- Team spaces.
- Public support articles awaiting review.
- Import/export jobs needing attention.

## Sidebar Rules

- Sidebar is sticky and fills the viewport.
- Main content scrolls independently.
- Article tree uses compact spacing.
- Text truncates with tooltip for long titles.
- Active article is visually clear.
- Hover and selected states must be readable.
- Search is available in sidebar and command menu.

## URL Rules

Use descriptive dynamic segment names:

- `/knowledge/spaces/[spaceId]`
- `/knowledge/articles/[articleId]`
- `/knowledge/templates/[templateId]`

Never use bare `[id]`.

## Surface Mapping

Knowledge internal surface:

- Owns all internal notes, spaces, articles, templates, reviews, permissions, and AI.

Support KB surface:

- Uses the same article table.
- Filters to `space.type = support`.
- Allows `visibility = public_help_center`.

Public Help Center surface:

- Read-only anonymous access only for published public articles.
- Must not expose private metadata, internal comments, draft history, or restricted attachments.

## Empty States

Every empty state must fill the available content area and include:

- Icon.
- Short title.
- One-line explanation.
- Primary action.

Examples:

- No spaces: Create your first space.
- No private notes: Start a private note.
- No favorites: Favorite articles you use often.
- No reviews: No articles need review.
- No search results: Create article from this search.

## Command Menu Actions

Knowledge should integrate with global command/search:

- Create article.
- Search articles.
- Open recent article.
- Open favorite article.
- Ask Knowledge AI.
- Create SOP from template.
- View articles needing review.

## Import And Export IA

Import entry points:

- Knowledge home quick action.
- Space detail action.
- Settings import page.

Supported import sources for MVP:

- Markdown files.
- HTML files.
- CSV article metadata.
- Existing StreamlineOS support KB.

Post-MVP import sources:

- Notion export.
- Confluence export.
- Google Docs.

Export entry points:

- Article actions.
- Space settings.
- Analytics/reporting.

Export formats:

- Markdown.
- HTML.
- CSV metadata.

## Trash IA

Trash must show:

- Deleted articles.
- Deleted spaces.
- Deleted templates.
- Deleted by.
- Deleted at.
- Restore action.
- Permanent delete action only if policy permits.
