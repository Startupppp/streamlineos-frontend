# DOC-10 — Competitor Baseline and Differentiation

## Outcome

Documents is not a Notion clone. P0 closes correctness and the table-stakes
gaps that make the current product feel unfinished. P1 is governance and
Ask quality. P2 is configurable databases. Every add must earn a customer
job already named in DOC-02 / DOC-14.

## Positioning

StreamlineOS Documents is the **organization knowledge system inside an
operating system**: the same tenant, the same people, the same projects, the
same Ask loop. Notion wins at personal databases. Confluence wins at space
governance. Slite wins at knowledge health. Coda wins at connected views.
We take the intersection that enterprises need next to HR, Build, and
Support — and we refuse the rest.

## References Reviewed (2026-09-19)

- [Notion — Wikis and verified pages](https://www.notion.com/help/wikis-and-verified-pages)
- [Notion — Search](https://www.notion.com/help/search)
- [Notion — Databases](https://www.notion.com/help/intro-to-databases)
- [Confluence — Content manager](https://support.atlassian.com/confluence-cloud/docs/manage-your-content-tree/)
- [Confluence — Archive content](https://support.atlassian.com/confluence-cloud/docs/archive-pages/)
- [Slite — Knowledge Management Panel](https://slite.com/help/_g08K8xDJLOGwA/Knowledge-Management-Panel)
- [Slite — Ask Insights](https://slite.com/help/qOc8RWWYHmGtml/Ask-Insights)
- [Coda — Filtering tables](https://help.coda.io/hc/en-us/articles/39555967334925-Overview-Filtering-tables)

Mobbin visual references were unavailable (paid plan). Official docs are
the competitive evidence.

## P0 — Ship or the Product Is Incomplete

| Capability | Who has it | We have | Add |
|---|---|---|---|
| Authoritative page + history | Notion, Confluence | Yes | Repair only |
| Spaces / IA | Confluence | Partial | Archive, members, search |
| Verified / stale trust | Notion, Slite | Metadata only | Badges on cards + search |
| Search with filters | Notion | Quick find only | `/knowledge/wiki/search` |
| Shared with me = real shares | Notion | Wrong query | Share grants |
| My pages = ownership | Notion, Slite | Wrong query | Owner list |
| Mobile browse | All | No rail | Drawer |
| Page menus on cards | Notion | Link-only | DOC-05 |
| Archive/restore spaces & pages | Confluence | Page soft-delete; space hard-delete | D06 |
| Trash at scale | Notion, Confluence | Cards, cap 100 | Table + bulk |
| Permission-aligned nav | Confluence | Partial | DOC-03 |
| Distinct overlays | All (basic UX) | Same tokens | DOC-09 |
| Ask with citations | Slite | Yes | ACL on sources/analytics |

## P1 — Governance and Ask Quality

| Capability | Who has it | Add |
|---|---|---|
| Content manager / health inventory | Confluence, Slite | `/knowledge/wiki/manage` — unowned, empty, stale, expired, overexposed |
| Bulk owner / verify / archive | Slite KM panel | DOC-05 bulk on Manage |
| Ask Insights (assign / dismiss / solve gaps) | Slite | Analytics rows become a workflow, not a list |
| Health presets as saved filter sets | Slite | URL presets, not a new view product |
| Space roles UI | Confluence | Members sheet |
| Review expired lifecycle | Confluence | Filter + badge |
| HTML/ZIP import completeness | Confluence | Existing import page, finish formats |
| Public page helpful/not-helpful | Help centers | Public wiki + `/help` |
| Property-driven list/table on **fixed** columns | Notion / Coda lite | View toggle + filters, not arbitrary properties |
| Record links as “connected” mentions | Coda | Keep record-links; do not build Coda tables |
| Research briefs in Documents | Internal | MOVE route |

## P2 — Explicit Non-Goals Until Approved

| Capability | Who has it | Verdict |
|---|---|---|
| Arbitrary databases / properties | Notion, Coda | **Out** — forks the page model |
| Board / calendar / timeline views of pages | Notion | **Out** |
| Saved personal view objects | Coda, Notion | **Out** (URL filters are enough) |
| Real-time multiplayer cursors | Notion | **Out** — autosave + conflict is P0 |
| Password-protected public pages | Notion | **Out** |
| AI auto-maintenance without a human | Slite experiments | **Out** — suggest only, human applies |
| Inline databases inside a page | Notion, Coda | **Out** |
| Marketplace templates | Notion | Starters + org templates are enough |

## Pages / Components / APIs / Features to Add

### Pages (from DOC-02)

- P0: `/knowledge/wiki/search`
- P1: `/knowledge/wiki/manage`, research-briefs list/detail
- Redirect: `/knowledge-base`

### Components (reuse first)

- Card action menu on `WikiPageCard`
- Wiki mobile Drawer
- Filter toolbar on every list
- Bulk bar on Trash / Reviews / Search / Manage
- Space members sheet
- Metadata mobile sheet
- Share-people picker (not only visibility enum)
- Search result row (title, snippet, space, trust, updated)
- Health preset chips (P1)

### APIs

- `GET /kb/pages` list + facets
- `POST /kb/pages/bulk`
- Page share grants CRUD
- Space archive/restore
- Sources/analytics `spaceId` + ACL
- Members hooks
- `kb:ai:generate` on metered routes

### Features

- Honest My pages / Shared
- Full search
- Bulk trash and reviews
- Distinct surfaces
- Catalog parity
- Ask Insights workflow (P1)

## Differentiation We Keep

1. **Ask KB is a product**, not a plugin — citations, conversations, sources.
2. **Same tenant as work** — a page can link a Build ticket, a person, a
   space; we do not become a second company wiki outside the OS.
3. **Universal member read** — every active member can ask and read what
   they are allowed to; authoring stays gated.
4. **Governance is reversible** — archive/restore, trash, reviews, verification.
5. **Project wiki is the same pages** — no shadow Confluence per project.

## Todos

- [ ] **DOC-10-001** P0 table is the release bar; do not slip P2 databases
      into P0.
- [ ] **DOC-10-002** Implement search, shares, card menus, trash table,
      mobile nav, overlay tokens, space archive (owners: DOC-01–09).
- [ ] **DOC-10-003** P1 Manage + Ask Insights + members + briefs move —
      separate launch after P0 evidence.
- [ ] **DOC-10-004** Record any newly requested Notion/Coda feature as P2
      in this file before building it.

## Acceptance

- [ ] P0 column “Add” is evidenced in DOC-11.
- [ ] No P2 surface shipped as if it were P0.

## Evidence Log

_Empty until DOC-10-001 through DOC-10-004 close._
