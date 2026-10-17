# Step 3 — Information Architecture and Design System Plan

## Target navigation

```text
Knowledge
├─ Ask KB
└─ Wiki
   ├─ Home
   ├─ My pages
   ├─ Shared with me
   ├─ Spaces
   │  └─ Space detail
   ├─ Templates
   ├─ Reviews
   ├─ Import & Export
   ├─ Analytics
   ├─ Content Health          P1, managers only
   ├─ Research Briefs         P1, when moved
   └─ Trash
```

Full Search is reached from global search, Quick find, and page-list search; it does not need a permanent sidebar row. History is a page child. Settings do not get a generic page until there are multiple customer-approved settings; retention remains in Trash.

## Navigation rules

- Read destinations are visible to every active member who can use Knowledge; management destinations appear only when the actor can use at least one action on them.
- Hidden navigation is convenience, not authorization. Every route and record is protected on the server.
- Sidebar labels describe user jobs. Use “My pages,” not “Private.” Use “Content Health,” not “Manage.”
- The document breadcrumb is the authoritative back path: Wiki → Space → ancestors → current page. A project adapter uses Project → Wiki → ancestors.
- Space and page moves preserve stable ids. Title and parent changes must not break saved links.
- Command palette and global Create expose the same authorized destinations as visible navigation.

## Page anatomy

```text
Breadcrumb / page identity                     Primary action / actions
Short purpose, scope, or freshness line         Permission-safe status
Search and URL-backed filters                   View/sort only if useful
Decision-useful summary                         Never vanity cards
Bounded collection or focused workspace
Selection-aware bulk bar                        Only when rows are selected
```

The first viewport answers: Where am I? What can I do? Is this current and safe? What is the next useful item?

## Component decision rules

| Need | Use | Do not use |
|---|---|---|
| One irreversible decision | Confirm dialog | Sheet or inline optimistic action |
| Up to five focused fields | Dialog | Full page |
| Six or more fields / source context needed | Sheet | Tiny popover |
| Reversible compact choice | Popover | Modal |
| Durable collaborative work | Full page | Nested modal editor |
| Repeated records with comparisons/bulk | Table + mobile cards | Decorative card grid only |
| Browsing low-density visual objects | Cards | Table with empty columns |
| Hierarchy | Lazy tree | Full tenant tree download |
| Result discovery | Snippet list | Tree |

## Action model

One action descriptor should drive card menus, row menus, right-click menus, command palette entries, and keyboard shortcuts. Each action declares:

- id and label;
- permission and record precondition;
- location eligibility;
- destructive/access/publication classification;
- optimistic or pessimistic behavior;
- confirmation copy;
- success patch and invalidation scope;
- audit event;
- keyboard shortcut, if safe.

The only path to an action can never be a context menu. Financial, access, approval, publication, purge, and destructive actions are pessimistic and confirmed.

## URL state

- Lists encode `q`, filters, sort, view, and stable cursor when shareable.
- Dialog, menu, selection, hover, pending mutation, and unsaved draft state remain local.
- Filter parsing uses one Zod-backed codec per page. Invalid values fall back safely and are normalized on the next interaction.
- Opening a result from Search preserves a deterministic back link to the exact query/filter state.

## Visual hierarchy

- Keep five semantic surface levels: application, sidebar, content, raised control, overlay.
- Status/trust colors use design tokens and always include icon/text.
- Headers are calm and compact. Do not stack hero text, banners, and summary cards above the work.
- Use one density scale: comfortable for authoring and cards, compact for admin queues and search results.
- Empty illustrations are reserved for genuine first-run emptiness, not errors or filtered zero results.
- AI is visually identified, but not visually dominant over content ownership and citations.

## Responsive behavior

| Width | Behavior |
|---|---|
| `< 640 px` | Wiki sidebar becomes a drawer; tables render task-focused mobile cards; metadata/comments are sheets; editor toolbar collapses to essential actions + overflow |
| `640–1023 px` | Collapsible navigation; filters wrap into a sheet; two-column cards where appropriate |
| `>= 1024 px` | Persistent navigation and optional right panel; dense tables; keyboard shortcuts visible |

No feature may exist only in a hover state or desktop right panel.

## Accessibility contract

- WCAG 2.2 AA target.
- Skip link lands on the true page main content, not the shell.
- One `h1`; heading order follows document structure.
- All icon buttons have stable accessible names; labels do not change to describe state ambiguously.
- Focus returns to the launcher after sheets/dialogs; destructive confirmations initially focus Cancel.
- Search/filter result count and asynchronous save state are announced without excessive live-region noise.
- Tree controls expose expanded, level, position, and set size; arrow-key behavior follows the tree pattern.
- Tables have headers; mobile cards preserve field labels and action names.
- Drag/drop always has a keyboard alternative.
- Editor formatting state is perceivable; color is not the only indicator.
- Reduced motion disables nonessential transitions; high zoom and 200% text do not lose actions.

## Content language

- Use concrete labels: “Restore 12 pages,” “Archive space,” “Shared by Priya,” “Reviewed 14 days ago.”
- Error copy says what failed, what was preserved, and what the user can do.
- A permission denial never suggests the record exists when the actor lacks access.
- AI states distinguish “no matching source,” “sources unavailable,” “generation failed,” and “budget/rate limit reached.”
- Avoid “magic,” “smart,” “AI-powered,” and generic confidence claims. Explain the evidence and action.

## Frontend module seams

### `KnowledgeNavigation`

**Interface:** current route, standing/permissions, counters requiring no page-content load.

**Implementation:** groups, visibility, mobile drawer, palette destinations.

**Why deep:** route naming and permission logic live in one place.

### `KnowledgeCollection`

**Interface:** schema-backed URL state, result projection, action descriptors, cursor.

**Implementation:** query, skeletons, filters, table/cards, mobile alternative, selection, retries.

**Adapters:** Pages, Spaces, Reviews, Trash, Templates, Health. Create an adapter only when a second real collection uses it.

### `KnowledgeDocument`

**Interface:** page id, optional project scope, reader/editor standing.

**Implementation:** load, editor, autosave, conflict, metadata, comments, links, history, share, AI preview.

**Adapters:** organization route and project route.

### `KnowledgeDiscovery`

**Interface:** query + scope → permission-safe result/citation projection.

**Implementation:** Quick find, full Search, Ask source picker, citation drawer.

**Why deep:** highlights, trust metadata, URL mapping, and authorization behavior stay consistent.

## Design QA matrix

Every page is captured in:

- 375 × 812, 768 × 1024, and 1440 × 900;
- light and dark themes if both are supported;
- loading, populated, first empty, filtered empty, error, denied;
- keyboard-only and screen-reader smoke tests;
- long title, long translated label, 200% zoom, and reduced motion;
- 1, 100, 10,000, and maximum permitted records for its collection behavior.
