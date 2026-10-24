# StreamlineOS Docs / Knowledge: Competitor-Required Features Assessment

**Assessment date:** 2026-10-24  
**Scope:** Product-capability benchmark for StreamlineOS Docs / Knowledge against ClickUp, Linear, Notion, Confluence, Google Workspace, Microsoft 365, Slite, and Guru.  
**Source policy:** Official product, documentation, and support sources only.  
**Purpose:** Separate what is required for a credible release from what is merely competitive breadth. This is not an implementation-completion audit; each StreamlineOS capability still needs source, role, persistence, browser, and deployment evidence before it can be called complete.

## Executive recommendation

StreamlineOS does **not** need to build every item in the historical Knowledge backlog now. The market evidence supports a much smaller release cut.

### Required now: release credibility

1. **A reliable collaborative document** — rich text, tables, links/embeds, attachments, autosave, comments and mentions, with no silent edit loss.
2. **A comprehensible information model** — Docs home, My files, Shared with me, Team folders/spaces, Templates, Quick find, and Trash; clear owner and location; move/copy without access surprises.
3. **Permission-safe discovery** — fast title/content search, useful filters, and the same authorization at result, preview, open, download, and Ask time.
4. **A single understandable permission contract** — View, Comment, Edit, and Manage; inherited team-folder access; explicit restricted folders/pages; immediate revocation.
5. **Usable external collaboration** — at minimum named guests plus a separately controlled public-link mode, visible access level, revoke, and expiry where links are offered.
6. **Recovery and accountability** — version history/restore, recoverable trash, meaningful activity, and an audit trail for access-changing actions.
7. **Templates and migration basics** — common templates, safe import/export, progress, actionable errors, and retry without duplicate content.
8. **First-class files only because StreamlineOS has chosen a Drive-first position** — upload, preview, download, organize, version, move, share, restore, and safe failure states. This would not be mandatory for a doc-only wiki, but it is mandatory for the product direction already selected.
9. **Permission-safe, cited Ask if the feature is visible or marketed** — scoped sources, openable citations, an honest no-answer state, stop/retry, and feedback. If this is not reliable, keep it explicitly beta or hide it from the release claim.

### Required next: useful maturity

- Content owner, verified/freshness status, review date, stale-content queue, and lightweight content-health remediation.
- Basic document/Ask analytics: views, unique viewers, searches, unanswered questions, negative feedback, and source usage.
- Access requests, assigned comments/action items, subscriptions, and review notifications.
- External-share inventory and bulk revoke for admins.
- Open/edit in Microsoft 365 or Google Workspace for Office files, with explicit fidelity limitations and desktop fallback.
- A small set of high-demand connectors for permission-aware search, chosen from customer evidence rather than breadth for its own sake.

### Defer: not a launch requirement

- A native spreadsheet engine or Excel/Google Sheets feature parity.
- Permission-safe Live Data Blocks across CRM, HR, Build, Finance, and Support.
- Broad cross-tool agents, automated knowledge maintenance, and AI evaluation suites.
- Deep analytics dashboards, complex approval workflows, legal hold/DLP, offline editing, and a generic database/app builder.

These can differentiate StreamlineOS later, but competitors do not show that they are prerequisites for validating the core Docs / Knowledge experience.

## Competitive capability benchmark

| Capability | What current competitors establish | Product judgment for StreamlineOS |
|---|---|---|
| Collaborative document editor | Linear documents provide realtime co-editing, slash formatting, references, inline comments, templates, subscriptions, and version history. Confluence combines realtime content with inline/page comments, history, and restore. Google Docs adds suggestions, comments, action items, and rich `@` building blocks. [Linear documents](https://linear.app/docs/documents), [Confluence content](https://support.atlassian.com/confluence-cloud/docs/create-edit-and-publish-a-page/), [Google comments](https://support.google.com/docs/answer/65129), [Google smart chips](https://support.google.com/docs/answer/10710316) | **P0 table stake.** Finish reliability and collaboration behavior before adding editor breadth. |
| Hierarchy, team spaces, and ownership | ClickUp centralizes Docs and Wikis in Docs Hub with recents, favorites, shared/private views, filters, tags, templates, and bulk actions. Notion uses private/shared sections and open, closed, private, or default teamspaces. Google Shared Drives are team-owned and preserve files when members leave. [ClickUp Docs Hub](https://help.clickup.com/hc/en-us/articles/14235667017495-Docs-Hub), [Notion permissions](https://www.notion.com/help/guides/sharing-and-permissions), [Google Shared Drives](https://support.google.com/a/users/answer/7212025) | **P0 table stake.** The owner/location model matters more than additional destinations. |
| Search and findability | ClickUp searches workspace assets and can index connected systems. Notion Enterprise Search can scope answers to a source, page, teamspace, or connected app and cites sources. Confluence offers structured search and permission-aware natural-language answers. Guru and Slite combine search with cited answers over connected sources. [ClickUp Connected Search](https://help.clickup.com/hc/en-us/articles/14642390285463-Connected-Search), [Notion Enterprise Search](https://www.notion.com/help/enterprise-search), [Confluence Rovo search](https://support.atlassian.com/confluence-cloud/docs/search-for-answers-using-atlassian-intelligence/), [Guru search and chat](https://help.getguru.com/docs/searching-for-knowledge-in-guru), [Slite Agent search](https://slite.com/help/TaEqEKcObHnZ7m/Find-any-answer-instantly) | **P0 table stake.** Conventional search cannot be replaced by Ask; users need both. |
| Internal permissions and inheritance | Confluence separates global, space, and content permissions. Google Shared Drives use role-based membership, inherited access, limited-access folders, and higher-level sharing restrictions. Microsoft libraries inherit permissions by default but can use unique scopes. [Confluence permissions](https://support.atlassian.com/confluence-cloud/docs/what-are-confluence-cloud-permissions-and-restrictions/), [Google Shared Drive access](https://support.google.com/a/users/answer/12380484), [Microsoft co-authoring and inheritance](https://support.microsoft.com/en-us/sharepoint/get-started-with-sharepoint/document-collaboration-and-co-authoring) | **P0 safety gate.** One authoritative evaluator must cover lists, search, previews, downloads, exports, Ask, and notifications. |
| Guests and public/external sharing | ClickUp supports workspace, people/team, guest, external invite, and public sharing with View/Comment/Edit semantics. Notion supports guests, teamspace controls, and web publishing. Confluence separates guests from public links and gives admins an active-link inventory. Microsoft applies organization/site sharing ceilings and supports named guests or anonymous links, including expiry and view-only constraints. [ClickUp sharing](https://help.clickup.com/hc/en-us/articles/6325333637271-Share-Docs), [ClickUp permissions](https://help.clickup.com/hc/en-us/articles/6309221065495-Permissions-in-detail), [Notion sharing](https://www.notion.com/help/sharing-and-permissions), [Confluence public-link controls](https://support.atlassian.com/confluence-cloud/docs/set-up-and-manage-public-links/), [Microsoft external sharing](https://learn.microsoft.com/en-us/sharepoint/external-sharing-overview), [Microsoft sharing controls](https://learn.microsoft.com/en-us/sharepoint/turn-external-sharing-on-or-off) | **P0 minimum, P1 governance depth.** Named guest/revoke is essential; inventory, domain policy, password and bulk revoke can follow for a controlled pilot but should precede broad enterprise claims. |
| Comments, review, and follow-up | Linear and Confluence support anchored comments, replies, resolve, mentions, and notifications. Google adds assigned action items and suggestions that owners can accept or reject. Notion supports suggested edits as a review mode. [Linear comments](https://linear.app/docs/comment-on-issues), [Confluence comments](https://support.atlassian.com/confluence-cloud/docs/comment-on-pages-and-blog-posts/), [Google suggestions](https://support.google.com/docs/answer/6033474), [Notion suggested edits](https://www.notion.com/help/suggested-edits) | **Comments are P0; formal review is P1.** Do not hold a pilot for a multi-stage approval engine. |
| Versions, archive, and trash | Linear documents have history and its archive includes recoverable deleted documents for up to 30 days. Notion shows page changes, previews restores, and keeps deleted pages in trash. Confluence supports version comparison/revert and archive. Google and Microsoft restore earlier versions of files. [Linear documents](https://linear.app/docs/documents), [Linear archives](https://linear.app/docs/delete-archive-issues), [Notion restore](https://www.notion.com/help/duplicate-delete-and-restore-content), [Confluence archive](https://support.atlassian.com/confluence-cloud/docs/archive-pages/), [Google version history](https://support.google.com/docs/answer/190843), [Microsoft file restore](https://support.microsoft.com/en-us/onedrive/restore-a-previous-version-of-a-file-stored-in-onedrive) | **P0 table stake.** A restore control is not complete until content, permissions, links, and files restore consistently. |
| Templates, import, and export | Linear supports workspace/team document templates. ClickUp exposes templates, import, export, duplicate, and archive actions. Notion imports common text, Word, CSV, PDF, HTML, ZIP, and third-party formats and displays import progress. [Linear documents](https://linear.app/docs/documents), [ClickUp Doc settings](https://help.clickup.com/hc/en-us/articles/6325168155415-Doc-settings), [Notion import](https://www.notion.com/help/import-data-into-notion) | **P0 basic set, P1 breadth.** Prioritize dependable common formats, mapping, progress, errors, and idempotent retry over many importers. |
| Files, previews, and office formats | Google Drive and SharePoint/OneDrive treat files and folders as primary objects with sharing, search, co-authoring, and versions. ClickUp largely integrates external cloud storage, previews, and attached files rather than replacing the office suites. [Google Drive sharing](https://support.google.com/drive/answer/7166529), [Microsoft co-authoring](https://support.microsoft.com/en-us/sharepoint/get-started-with-sharepoint/document-collaboration-and-co-authoring), [Microsoft versioning](https://support.microsoft.com/en-us/sharepoint/data-and-lists/view-the-version-history-of-an-item-or-file-in-a-list-or-library), [ClickUp Google Drive integration](https://help.clickup.com/hc/en-us/articles/14841781940759-Google-Drive-integration) | **P0 for StreamlineOS's Drive-first claim.** Use provider editing for high-fidelity Office work instead of building an office suite. |
| Native spreadsheets | Google Sheets and Excel are standalone specialist products. Notion converts CSV/Excel data into databases; ClickUp and Linear focus on documents, tables, embeds, and integrations. Microsoft Lists can import Excel/CSV into structured lists. [Notion import](https://www.notion.com/help/import-data-into-notion), [Microsoft Lists](https://support.microsoft.com/en-us/sharepoint/lists/create-a-list-from-the-lists-app) | **Not a KB P0.** Preserve, preview, search, version, and open Office files reliably; native spreadsheet depth is optional. |
| AI Ask and cited answers | Notion, Confluence, Slite, and Guru all provide natural-language answers with sources while respecting accessible content. Guru and Slite also expose answer feedback and connected sources. [Notion Enterprise Search](https://www.notion.com/help/enterprise-search), [Notion connectors](https://www.notion.com/help/notion-ai-connectors), [Confluence Rovo search](https://support.atlassian.com/confluence-cloud/docs/search-for-answers-using-atlassian-intelligence/), [Slite Agent search](https://slite.com/help/TaEqEKcObHnZ7m/Find-any-answer-instantly), [Guru search and chat](https://help.getguru.com/docs/searching-for-knowledge-in-guru) | **Market baseline if offered; otherwise P1.** Never trade citation and access correctness for a broader answer surface. |
| Knowledge trust and freshness | Notion has owners, verified pages, verification expiry, reminders, and an inventory of verified content. Guru uses verification across native and connected content and can filter search/AI by trust state. Slite surfaces stale content, verification cycles, and human-reviewed update proposals. [Notion verified pages](https://www.notion.com/help/wikis-and-verified-pages), [Guru verification](https://help.getguru.com/docs/what-is-verifcation), [Slite knowledge base](https://slite.com/solutions/knowledge-base) | **High-value P1 differentiator.** A small owner/review/freshness loop is more valuable than another dashboard. |
| Analytics and governance | Notion supplies page and organization analytics. Confluence and Slite expose content views and engagement. Guru tracks questions, source usage, answer feedback, unanswered questions, and review workflows. Microsoft is adding Copilot citation insights alongside file/site statistics. [Notion page analytics](https://www.notion.com/en-gb/help/page-analytics), [Notion organization controls](https://www.notion.com/help/organization-level-controls), [Slite doc insights](https://slite.slite.page/p/u_P3xyEQTsCp5D/Doc-Information-and-Insights), [Guru answer analytics](https://help.getguru.com/docs/viewing-answers-analytics), [Microsoft Copilot citations](https://support.microsoft.com/en-au/sharepoint/sites-in-sharepoint/copilot-citations) | **Basic analytics P1; deep analytics P2.** Use data to find stale content and failed questions, not to create vanity dashboards. |
| Integrations and live operational data | Linear's strength is attaching documents and resources directly to projects, initiatives, issues, cycles, and teams. ClickUp links Docs and tasks. Notion syncs GitHub, Jira, and Salesforce records into databases. Confluence connects content with Jira and external apps; Microsoft agents work over selected SharePoint sources. [Linear documents](https://linear.app/docs/documents), [Linear projects](https://linear.app/docs/projects), [ClickUp Doc relationships](https://help.clickup.com/hc/en-us/articles/6325337447063-See-and-create-Doc-Relationships), [Notion synced databases](https://www.notion.com/help/sync-data-from-other-tools-to-notion), [Confluence features](https://www.atlassian.com/software/confluence/features), [SharePoint agents](https://support.microsoft.com/en-us/sharepoint/copilot-in-sharepoint/get-started-with-agents-in-sharepoint) | **Stable links are P0; live blocks are P2 differentiation.** Link one canonical file to work records now. Build permission-safe live data only after the core contract is proven. |

## What each competitor should influence

### ClickUp

Use ClickUp as the benchmark for connecting documents to operational work: Docs Hub, wikis, task/document relationships, comments that can become work, and integrated search. It does **not** justify building a full office suite; ClickUp itself relies heavily on cloud-storage integration and previews.

### Linear

Use Linear as the benchmark for focused, low-friction documents in the context of projects, issues, initiatives, cycles, and teams. Linear is **not** a full Drive or enterprise knowledge-governance benchmark. Its product strength is contextual documentation and structured project updates, not a broad file library. [Linear project updates](https://linear.app/docs/initiative-and-project-updates)

### Notion

Use Notion as the benchmark for flexible hierarchy, teamspaces, sharing, databases, templates, fast authoring, verified pages, and cross-tool AI search. Do not copy its generic-database breadth before the document, file, and permission foundations are dependable.

### Confluence

Use Confluence as the benchmark for spaces, published knowledge, content trees, page history, guests/public access controls, comments, archive, administration, and Jira-connected knowledge. It shows that governance can remain powerful without putting every control in everyday navigation.

### Google Workspace and Microsoft 365

Use Google as the benchmark for understandable collaboration and team-owned storage, and Microsoft as the benchmark for Office-file fidelity, library inheritance, guest policy, versioning, retention, and enterprise administration. Integrate with these ecosystems rather than trying to reproduce their spreadsheet and office-editing depth.

### Slite and Guru

Use Slite and Guru as the benchmark for a modern knowledge product: cited, permission-aware answers; owner/verification/freshness signals; feedback; unanswered-question and source analytics; and human-controlled remediation. These features matter after the underlying search corpus and permissions are trustworthy.

## Recommended release cut

### Controlled pilot gate

A controlled pilot can proceed when these journeys work end to end for at least member, manager/admin, read-only member, and external guest roles:

1. create/edit/autosave/reopen a document;
2. comment, mention, resolve, and receive the expected notification;
3. upload, preview, download, version, move, and restore a file;
4. find allowed content by title and body, and never see forbidden metadata;
5. share internally and with one named external user, then revoke access immediately;
6. inspect and restore version history and trash;
7. create from a template and import/export a common format with recoverable failure;
8. ask a scoped question and receive either cited, openable evidence or an explicit no-answer result.

If a capability exists in code but lacks this behavior-level evidence, classify it as **implemented but unverified**, not as a missing product feature and not as complete.

### Broad release gate

Before a general-availability or enterprise-ready claim, add:

- external-share inventory, expiry enforcement, bulk revoke, and exportable access audit;
- content owner/review date/verified state and stale-content remediation;
- basic content and Ask analytics with unanswered-question handling;
- proven large-library search/pagination, accessibility, mobile behavior, performance, recovery, and tenant isolation;
- a supported Office-file integration and documented fidelity/degraded-mode contract.

### Explicitly out of the immediate gate

Do not hold the pilot for native spreadsheet parity, Live Data Blocks, broad connector coverage, autonomous content maintenance, deep trend dashboards, or advanced compliance suites. Those should be funded by customer demand and built after the P0 journeys are reliable.

## Decision rule for the current TODO ledger

Every remaining TODO should be recategorized into one of four buckets:

1. **Real P0 product gap** — a required journey or safety contract is absent.
2. **Implemented, evidence pending** — the behavior exists, but role/browser/persistence/deployment proof is missing.
3. **P1 maturity** — valuable after the controlled pilot, but not a pilot blocker.
4. **P2 differentiator / defer** — native spreadsheets, Live Data Blocks, broad connectors/agents, or deep analytics.

This avoids treating a historical count of open checkboxes as the number of missing features. Competitor parity should be judged by complete customer journeys and security behavior, not by the existence of individual routes, components, or backlog rows.
