# FILTER inventory — Public Docs only (Directs)

**Purpose:** Cited filter/search/view grammar for StreamlineOS Build competitor deep-dive while signed-in walks are captcha/crash gated.  
**Access date:** 2026-10-01 (Asia/Calcutta)  
**Evidence class:** Every claim row is **PUBLIC-DOC** — **not** UI-VERIFIED. Do not treat as signed-in product confirmation.  
**Sources:** Official Help / Docs / Changelog / first-party resources only (WebFetch / WebSearch). No invented signed-in UI.

### Build craft cross-map (PARITY-seeking vs BEHIND candidates)

| Build craft | Intent | Typical Direct docs signal |
| --- | --- | --- |
| Status / Priority / Type / Assignee / Cycle / Due | **PARITY-seeking** core issue filters | Documented across Linear, ClickUp, Jira; monday columns; Asana search/list filters |
| Labels (**UX-026**) | Filter by label/tag | Linear labels; ClickUp Tags; Jira `labels`; monday Label column |
| Epic (**UX-027**) | Epic/parent relation in filters | Jira `parent` / retired Epic link → Parent; Linear Relations/Project; ClickUp Custom Relationships |
| Release | Fix/affects version / release membership | Jira `fixVersion` / `affectedVersion`; Linear milestone (via project) |
| AND–OR | Combinators / nested groups | Linear Advanced filters; ClickUp mixed/nested; Jira JQL AND/OR; monday advanced AND/OR groups |
| Relative dates | Today / next week / `-5d` / ISO durations | Linear date quick filters + API relative; ClickUp date presets; Jira `now()` / `startOfWeek()` / `"-5d"`; monday next/last week |
| Custom fields in filters | First-class filter dimension | ClickUp / Jira / Asana / monday columns; Linear (workspace-feature dependent — docs emphasize standard props) |
| Named saved views / share | Durable named filters | Linear Custom Views; ClickUp Save view / saved filters; Jira saved filters; monday Save as new view; Asana starred search / reports; Zoho Custom Views |

---

## 1. Linear

**Primary docs:** [Filters](https://linear.app/docs/filters) · [Custom Views](https://linear.app/docs/custom-views) · [Advanced filters changelog](https://linear.app/changelog/2026-02-13-advanced-filters-and-share-issues-in-private-teams) · [API Filtering](https://linear.app/developers/filtering)

### Filter / search / view fields listed — PUBLIC-DOC

| Field / property | Notes | URL | Quote / snippet |
| --- | --- | --- | --- |
| Assignees, statuses, labels, projects, cycles, and more | Docs state filters refine lists for these | https://linear.app/docs/filters | “They can be used across issue lists to focus on specific assignees, statuses, labels, projects, cycles, and more.” |
| Team | Quick filter by team name | https://linear.app/docs/filters | Quick filters table: Property type **Team** → Team name |
| Status | Quick filter by status name | https://linear.app/docs/filters | Quick filters: **Status** → Status name |
| Assignee / Created by / Subscriber | Username quick filters | https://linear.app/docs/filters | Quick filters: Assignee / Created by / Subscriber → Username |
| Priority | e.g. High, Low | https://linear.app/docs/filters | Quick filters: Priority → `"High", "Low", etc.` |
| Labels | Label or label group name | https://linear.app/docs/filters | Quick filters: Labels → Label or label group name |
| Cycle | Active, Upcoming | https://linear.app/docs/filters | Quick filters: Cycle → Active, Upcoming |
| Project | Project name | https://linear.app/docs/filters | Quick filters: Project → Project name |
| Relations | Top-level filters | https://linear.app/docs/filters | Quick filters: Relations → “These are top level filters” |
| Date filters | Created/updated/completed/due style dates | https://linear.app/docs/filters | Quick filters: Date filters → `"N days", Month, Quarter, Half-year, Year` |
| Links | Front, Zendesk, Intercom, custom | https://linear.app/docs/filters | Quick filters: Links → Front, Zendesk, Intercom, custom link source |
| Milestone | Requires project filter first | https://linear.app/docs/filters | “To filter by milestones, you must filter by project first.” / Quick filters: Milestone → Milestone name |
| Added to cycle | Distinct from Cycle membership | https://linear.app/docs/filters | “The Added to cycle filter is different from Cycle.” Values: Planned / After cycle |
| Content | No quick filters | https://linear.app/docs/filters | Quick filters: Content → “No quick filters available” |
| Priority + Label + Customer status (example combo) | Changelog example | https://linear.app/changelog/2026-02-13-advanced-filters-and-share-issues-in-private-teams | “combining `Priority`, `Label`, and `Customer status` filters.” |

**Build map:** Status/Priority/Assignee/Cycle/Due → **PARITY-seeking**. Labels → **UX-026 BEHIND candidate**. Milestone/release-adjacent → Release **BEHIND candidate**. Relations → Epic **UX-027 BEHIND candidate** (docs do not name “Epic”; Relations/Project/Initiative are documented).

### Operators — PUBLIC-DOC

| Operator / combinator | URL | Quote / snippet |
| --- | --- | --- |
| is / is not (single option) | https://linear.app/docs/filters | “is or is not when one option is included in the filter” |
| is either of / is not (multi) | https://linear.app/docs/filters | “is either of or is not when multiple options are included in the filter” |
| includes any, all, neither, either, or none (labels/links) | https://linear.app/docs/filters | “includes any, all, neither, either, or none for labels and links” |
| before / after (dates) | https://linear.app/docs/filters | “before or after for date-related filters” |
| AND/OR + nested groups (Advanced filter) | https://linear.app/docs/filters | “grouping conditions and combining them with AND/OR logic (including nested filter groups)” |
| AND/OR (changelog) | https://linear.app/changelog/2026-02-13-advanced-filters-and-share-issues-in-private-teams | “Combine multiple `AND`/`OR` conditions” |
| API: eq, neq, in, nin, lt/lte/gt/gte, contains… | https://linear.app/developers/filtering | Comparators table: `eq`, `neq`, `in`, `nin`, `lt`… `contains`, `notContains`… |
| API logical `or` (default AND) | https://linear.app/developers/filtering | “The filter merges all the conditions together using a logical and operator.” / “all filters support the `or` keyword” |
| Relative time (API ISO 8601 durations) | https://linear.app/developers/filtering | “All date fields support relative time, defined as ISO 8601 durations” e.g. `dueDate: { lt: "P2W" }` |
| AI natural-language filter | https://linear.app/docs/filters | “filter by phrases like … \"what issues are due next week\"” |

**Build map:** AND–OR + relative dates → **BEHIND candidates**.

### Saved views / share — PUBLIC-DOC

| Capability | URL | Quote / snippet |
| --- | --- | --- |
| Custom views of issues/projects/initiatives | https://linear.app/docs/custom-views | “Create durable filtered views of issues, projects, or initiatives that you can save and share” |
| Save filtered board/list (`⌥/Alt V`) | https://linear.app/docs/custom-views | “save any filtered board or list as a custom view with the keyboard shortcut `Option/Alt` `V`” |
| Share scoped to workspace / team / project / initiative | https://linear.app/docs/custom-views | “If a shared view is created at the workspace level… If you select a specific team, project, or initiative…” |
| Copy view URL (access still required) | https://linear.app/docs/custom-views | “Sharing a link does not automatically give anyone access to a view, it must be shared first.” |
| Filters in browser URL (temporary share) | https://linear.app/docs/filters | “The applied filters are also reflected in the browser URL. You can copy the browser address to share the filtered view” |
| Favorite / subscribe / Slack notify | https://linear.app/docs/custom-views | Favorite views; “Subscribe”; “Configure custom view Slack notifications” |

**Build map:** Named saved views + share → **BEHIND candidates**.

### Custom fields in filters — PUBLIC-DOC

| Claim | URL | Quote / snippet |
| --- | --- | --- |
| Exact set varies by workspace features / view | https://linear.app/docs/filters | “The exact set of available [filters] can vary by workspace features and by the view you’re in.” |
| Customer status cited in advanced-filter example | https://linear.app/changelog/2026-02-13-advanced-filters-and-share-issues-in-private-teams | “Priority`, `Label`, and `Customer status`” |
| No exhaustive “custom fields in filters” product-help table found on Filters page | https://linear.app/docs/filters | Filters page catalogs standard properties (Team, Status, Labels, Cycle, …) — **do not invent** a full custom-field operator matrix without further docs/UI |

**Build map:** Custom fields in filters → **BEHIND candidate** if Build lacks parity; Linear docs emphasize standard props + feature-dependent availability.

---

## 2. ClickUp

**Primary docs:** [Filter and search tasks in List view](https://help.clickup.com/hc/en-us/articles/6310206119575-Filter-and-search-tasks-in-List-view) · [Use filters to search tasks](https://help.clickup.com/hc/en-us/articles/6308875427223-Use-filters-to-search-tasks) · [Custom Fields filter](https://help.clickup.com/hc/en-us/articles/12665650881943-Search-sort-and-filter-tasks-by-Custom-Fields) · [Saving view filters](https://help.clickup.com/hc/en-us/articles/6311659064983-Saving-view-filters) · [Save view changes](https://help.clickup.com/hc/en-us/articles/6310370965911-Save-view-changes)

### Filter / search / view fields listed — PUBLIC-DOC

| Field | URL | Quote / snippet |
| --- | --- | --- |
| Status | https://help.clickup.com/hc/en-us/articles/6310206119575-Filter-and-search-tasks-in-List-view | “Status \| Only show tasks that are in selected statuses.” |
| Tags | same | “Tags \| Only show tasks with specific tags… filter for tasks that do not contain tags.” |
| Due date | same | “Due date \| … due on a specific date, or before or after… Today & Earlier…” |
| Priority | same | “Priority \| Only show tasks with selected Priorities.” |
| Assignee | same | “Assignee \| Only show tasks assigned to a specific user” |
| Archived / Assigned comments / Created by | same | Table rows for Archived, Assigned comments, Created by |
| Date closed / created / updated / done | same | Date closed, Date created, Date updated, Date done |
| Dependency / Duration / Location | same | Dependency, Duration, Location (Spaces/Folders/Lists) |
| Recurring / Start date / Status is closed | same | Recurring, Start date, Status is closed |
| Time estimate / Time tracked / Sprint Points | same | Time estimate, Time tracked, Sprint Points |
| Follower / Milestone / Task type | same | Follower, Milestone, Task type |
| Custom Fields | same | “Custom Fields \| Filter by Custom Fields.” |
| Custom Relationships | same | “Custom Relationships \| Filter tasks by a specific Custom Relationship.” |
| Last status change | same | “Last status change \| … most recent status change” |
| Assignees / Tags / Priority / Status / Task type / Custom fields (rollup list) | https://help.clickup.com/hc/en-us/articles/6308875427223-Use-filters-to-search-tasks | “Available filters” lists Assignees, Priority, Status, Tags, Task type, Custom fields, Dependencies, etc. |

**Build map:** Status/Priority/Type/Assignee/Due → **PARITY-seeking**. Tags → **UX-026**. Milestone / Custom Relationships → Epic/Release-adjacent **BEHIND candidates**. Sprint Points → Cycle-adjacent **BEHIND candidate**.

### Operators — PUBLIC-DOC

| Operator / combinator | URL | Quote / snippet |
| --- | --- | --- |
| Is / Is not / Is set | https://help.clickup.com/hc/en-us/articles/6308875427223-Use-filters-to-search-tasks | “Operators, like Is set and Is not. Certain filters only allow Is or Is not.” |
| And/Or switcher + nested filters | same | “select an operator from the And/Or switcher” / “+ Nested filter” |
| Greater than / less than / equal to (estimates, tracked time, sprint points) | https://help.clickup.com/hc/en-us/articles/6310206119575-Filter-and-search-tasks-in-List-view | Time estimate/tracked/Sprint Points: “greater than, less than, or equal to” |
| Date presets / ranges (Today, This week, Before, Date range, Next week…) | https://help.clickup.com/hc/en-us/articles/6308875427223-Use-filters-to-search-tasks | “fixed choice, like Today or This week” / example “Due date, Is, Next week” |
| Multi-select Dropdown CF; People CF permission-scoped | https://help.clickup.com/hc/en-us/articles/12665650881943-Search-sort-and-filter-tasks-by-Custom-Fields | “select multiple dropdown options” / People CF: users with permissions to Space/Folder/List |

**Build map:** AND–OR + nested + relative date presets → **BEHIND candidates**.

### Saved views / share — PUBLIC-DOC

| Capability | URL | Quote / snippet |
| --- | --- | --- |
| Save view for everyone / Autosave / Save as new view | https://help.clickup.com/hc/en-us/articles/6310370965911-Save-view-changes | “Save view: Saves the view for everyone who has access” / Autosave / Save as new view |
| Personal vs Workspace saved filters | https://help.clickup.com/hc/en-us/articles/6311659064983-Saving-view-filters | “Personal filters… only visible to you.” / “Workspace filters… entire Workspace… shared” |
| View templates preserve filters | https://help.clickup.com/hc/en-us/articles/6310410797079-View-Templates | “View templates save the filters, grouping, sorting, and other view preferences.” |

**Build map:** Named saved views / share → **BEHIND candidates**.

### Custom fields in filters — PUBLIC-DOC

| Claim | URL | Quote / snippet |
| --- | --- | --- |
| Filter by Custom Fields in List/Board/Calendar/Gantt/Table | https://help.clickup.com/hc/en-us/articles/12665650881943-Search-sort-and-filter-tasks-by-Custom-Fields | “Filter tasks by Custom Fields” in List, Board, Calendar, Gantt, or Table |
| Search CF types (text, dropdown, labels, email…) | same | Searchable CF types: Text, Text area, Dropdown, Labels, Email, Phone, Website, Location |
| Only CFs added as columns searched | same | “Only Custom Fields added as columns in your view will be searched.” |

**Build map:** Custom fields in filters → **BEHIND candidate**.

---

## 3. Jira Cloud

**Primary docs:** [JQL fields](https://support.atlassian.com/jira-software-cloud/docs/jql-fields/) · [JQL operators](https://support.atlassian.com/jira-software-cloud/docs/jql-operators/) · [JQL keywords](https://support.atlassian.com/jira-software-cloud/docs/jql-keywords/) · [JQL functions](https://support.atlassian.com/jira-software-cloud/docs/jql-functions/) · [Save your search as a filter](https://support.atlassian.com/jira-software-cloud/docs/save-your-search-as-a-filter/) · [Search for work items](https://support.atlassian.com/jira-software-cloud/docs/search-for-work-items-in-jira/)

### Filter / search / view fields listed — PUBLIC-DOC (selected; JQL fields page is exhaustive)

| Field (JQL) | Build craft map | URL | Quote / snippet |
| --- | --- | --- | --- |
| `status` | Status PARITY | https://support.atlassian.com/jira-software-cloud/docs/jql-fields/ | “Search for work items that have a particular status.” |
| `priority` | Priority PARITY | same | “Search for work items with a particular priority.” |
| `type` / `workType` | Type PARITY | same | “Search for work items that have a particular work type.” |
| `assignee` | Assignee PARITY | same | “Search for work items that are assigned to a particular user.” |
| `sprint` | Cycle PARITY-seeking | same | “Search for work items that are assigned to a particular sprint.” + `openSprints()` / `closedSprints()` |
| `due` / `dueDate` | Due PARITY | same | “Search for work items that were due on, before, or after a particular date” |
| `labels` | UX-026 BEHIND | same | “Search for work items tagged with a label or list of labels.” |
| `parent` | UX-027 BEHIND | same | “Search for all child work items of a parent work item.” Epic link retired Feb 2024 in favor of Parent |
| `fixVersion` / `affectedVersion` | Release BEHIND | same | Fix version / Affected version search |
| Custom field / `cf[id]` | Custom fields BEHIND | same | “Only applicable if your Jira administrator has created one or more custom fields.” |
| `filter` | Named saved views | same | “You can use a saved filter to narrow your search.” |
| `component`, `reporter`, `created`, `updated`, `resolution`, … | Extended | same | Full field catalog on JQL fields page |

### Operators — PUBLIC-DOC

| Operator / keyword | URL | Quote / snippet |
| --- | --- | --- |
| `=` `!=` `>` `>=` `<` `<=` | https://support.atlassian.com/jira-software-cloud/docs/jql-operators/ | Equals, Not equals, Greater/Less than family |
| `IN` / `NOT IN` | same | “value of the specified field is one of multiple specified values” |
| `~` CONTAINS / `!~` DOES NOT CONTAIN | same | Text fuzzy/exact match on summary, description, comments, text CFs |
| `IS` / `IS NOT` EMPTY/NULL | same | Empty-field checks |
| `WAS` / `WAS IN` / `WAS NOT` / `CHANGED` | same | Historical status/assignee/priority/fixVersion/… |
| `AND` / `OR` / `NOT` | https://support.atlassian.com/jira-software-cloud/docs/jql-keywords/ | “joins two or more clauses” / expand / negate |
| Relative dates `"-5d"`, `now()`, `startOfWeek()`, `endOfDay()`, … | https://support.atlassian.com/jira-software-cloud/docs/jql-operators/ + https://support.atlassian.com/jira-software-cloud/docs/jql-functions/ | e.g. `created >= "-5d"`; `due < endOfDay()`; `startOfWeek()` / `endOfWeek()` |

**Build map:** AND–OR + relative dates + history operators → strong **BEHIND candidates** vs Build.

### Saved views / share — PUBLIC-DOC

| Capability | URL | Quote / snippet |
| --- | --- | --- |
| Save search as filter | https://support.atlassian.com/jira-software-cloud/docs/save-your-search-as-a-filter/ | “save searches, called filters, for later use” |
| Share / email / subscribe / dashboard gadgets | same | “Share and email search results… Have search results emailed… Display… in a dashboard gadget” |
| Reference filter by name or ID in JQL | https://support.atlassian.com/jira-software-cloud/docs/jql-fields/ | `filter = "My Saved Filter"` or `filter = 12000` |

**Build map:** Named saved filters + share/subscribe → **BEHIND candidates**.

### Custom fields in filters — PUBLIC-DOC

| Claim | URL | Quote / snippet |
| --- | --- | --- |
| Custom fields searchable by name or `cf[ID]` | https://support.atlassian.com/jira-software-cloud/docs/jql-fields/ | “You can search by custom field name or custom field ID” |
| Operators depend on CF type (number/date/picker/text/URL) | same | Tables of supported operators per CF type |
| Date/time CFs support `now()`, `startOfDay()`, … | same | Supported functions for date/time custom fields |

---

## 4. monday.com

**Primary docs:** [The Board Filters](https://support.monday.com/hc/en-us/articles/360003624660-The-Board-Filters) · [Advanced board filters](https://support.monday.com/hc/en-us/articles/25722908508946-Advanced-board-filters)

### Filter / search / view fields listed — PUBLIC-DOC

| Mechanism / field | URL | Quote / snippet |
| --- | --- | --- |
| Search bar (per-column scope, max 50 columns) | https://support.monday.com/hc/en-us/articles/360003624660-The-Board-Filters | “customize the columns and values on which your search will be performed” / “maximum number of columns… is 50” |
| Person filter (People / Last Updated / Creation Log) | same | “filter your own tasks or those of any of your teammates” / People Column, Last Updated, Creation Log |
| Quick suggested filters (counts) | same | “suggested quick filters… numbers next to each filtering option display the count” |
| Advanced: any board **column** + condition + value | https://support.monday.com/hc/en-us/articles/25722908508946-Advanced-board-filters | “choose the column you want to filter by, the condition, and the value” |
| AI text-to-filter columns | same | Status, Date, Person, Text, Dropdown, Groups, Item name, Numbers, Connect Boards |
| Subitem columns / parent columns | same | Filter by parent columns, subitem columns, or both |
| Dynamic People filter (“current viewer”) | same | “dynamic” option on People Column → personal view per viewer |
| Status / Label / Priority / People / Connect Boards (auto-filter “Bring it back”) | https://support.monday.com/hc/en-us/articles/360003624660-The-Board-Filters | “Bring it back feature supports the Status Column, Label Column, Priority Column, People Column, and the Connect Boards Column.” |

**Build map:** Status/Priority/Assignee(People)/Due(Date) → **PARITY-seeking** via columns. Label column → **UX-026**. Connect Boards / hierarchy → Epic-adjacent **UX-027 BEHIND candidate**.

### Operators — PUBLIC-DOC

| Operator / combinator | URL | Quote / snippet |
| --- | --- | --- |
| AND or OR across multiple conditions | https://support.monday.com/hc/en-us/articles/25722908508946-Advanced-board-filters | “When adding multiple conditions, you can choose AND or OR” |
| New group with And/Or extensions | same | “New group” … “And” or “Or” extensions |
| Date / timeline: next week / last week / next month (calendar weeks) | same | “\"next week\" means the following week, Monday through Sunday, not the last seven days” |
| Automatic filtering only `is` / `and` | https://support.monday.com/hc/en-us/articles/360003624660-The-Board-Filters | “only supports filters based on \"is\" or \"and\" logic” |
| Conditions vary by column type | https://support.monday.com/hc/en-us/articles/25722908508946-Advanced-board-filters | “Each column type will result in different options” (conditions key referenced; full matrix UI-gated) |

**Build map:** AND–OR groups + relative week/month → **BEHIND candidates**. Exact per-column operator list not fully enumerated in text (docs defer to UI key) — do not invent.

### Saved views / share — PUBLIC-DOC

| Capability | URL | Quote / snippet |
| --- | --- | --- |
| Save to this view / name saved view | https://support.monday.com/hc/en-us/articles/360003624660-The-Board-Filters | “Save to this view” … “name the saved view as you wish” |
| Save as new view (advanced) | https://support.monday.com/hc/en-us/articles/25722908508946-Advanced-board-filters | “Save as new view” in filter window |
| Delete named filtered view | https://support.monday.com/hc/en-us/articles/360003624660-The-Board-Filters | three-dots → Delete |
| Plan note: quick/advanced filters Standard+ | same | “quick filters are available on the Standard plan and above” / advanced likewise |

**Build map:** Named saved views → **BEHIND candidates**.

### Custom fields in filters — PUBLIC-DOC

| Claim | URL | Quote / snippet |
| --- | --- | --- |
| Board columns are the filter dimensions (Status, Dropdown, Text, Numbers, Date, Person, …) | https://support.monday.com/hc/en-us/articles/25722908508946-Advanced-board-filters | AI filter available column types list; advanced filter chooses any column |
| Mirror-of-mirror columns not filterable | https://support.monday.com/hc/en-us/articles/360003624660-The-Board-Filters | “unable to show data from a Mirror Column that displays information from other Mirror Columns” |

**Build map:** Column-as-custom-field filters → **BEHIND candidate**.

---

## 5. Asana

**Primary sources:** [Asana tips: Advanced Search and reporting](https://asana.com/resources/asana-tips-advanced-search-reporting) (first-party resource, fetchable) · Help Center articles indexed via WebSearch (full Help SPA often blocked to fetch providers — quotes from indexed Help / resource text only)

**Note:** `help.asana.com` article fetches returned CSS/401 errors on 2026-10-01; claims below stick to fetchable resource copy + WebSearch-indexed Help snippets with URLs. Still **PUBLIC-DOC**, not UI-VERIFIED.

### Filter / search / view fields listed — PUBLIC-DOC

| Field / parameter | URL | Quote / snippet |
| --- | --- | --- |
| Collaborators | https://asana.com/resources/asana-tips-advanced-search-reporting | “search based on collaborators, date created, or associated projects” |
| Date created / date ranges | same | “set the date range to narrow the scope” |
| Assigned to | same | “select yourself in the Assigned to field” |
| Completed / incomplete tasks | same | “selecting completed tasks” / “incomplete tasks due within the next 7 days” |
| Projects / Teams | same | “More > Teams” / “specifying what projects you want to search” |
| Custom fields (e.g. Priority) | same | “Add Custom Field so you can sort by high priority tasks” / “using Priority custom fields” |
| Assigned by | same | “Assigned by filter in Add filter > People > Assigned by” |
| Task vs Conversation result type | same | “select Task or Conversation to filter out unwanted results” |
| Advanced Search + Add Filter (Help) | https://help.asana.com/s/article/search-and-search-views?language=en_US | Indexed: “Click +Add Filter to use additional search parameters” / Custom fields filter; “custom field must be in your organization's field library” |
| Due dates and start dates (Help examples) | same Help article (indexed) | Indexed examples cite due dates / start dates / custom field status |
| List view Filter (project) | https://help.asana.com/s/article/list-view | Indexed: Filter → incomplete/completed, assignee, due date, custom fields |

**Build map:** Assignee/Due/Status(completion) → **PARITY-seeking**. Custom Priority field → Priority **PARITY-seeking** (via CF). Labels/Epic/Release/Cycle not first-class in cited Asana search copy → treat Epic/Release/Cycle as **BEHIND** vs Jira/Linear unless later UI proves otherwise.

### Operators — PUBLIC-DOC

| Operator / combinator | URL | Quote / snippet |
| --- | --- | --- |
| Multiple filters combined in Advanced Search | https://asana.com/resources/asana-tips-advanced-search-reporting | Workflow examples stack Assigned to + completed + date range + custom field + Teams |
| Relative windows in examples (“next 7 days”, “next 3 days”, “past six months”) | same | “incomplete tasks due within the next 7 days”; “high priority tasks due within the next 3 days” |
| Explicit AND/OR grammar | — | **Not fully documented** in fetched resource text — do not invent Asana AND/OR UI semantics |

**Build map:** Relative due windows documented in examples → **BEHIND candidate**. Full operator matrix → UNKNOWN pending Help/UI.

### Saved views / share — PUBLIC-DOC

| Capability | URL | Quote / snippet |
| --- | --- | --- |
| Save Advanced Search as report in left nav | https://asana.com/resources/asana-tips-advanced-search-reporting | “save an Advanced Search as a report by adding it to your left hand navigation… automatically refresh” |
| Star / save search view (Help) | https://help.asana.com/s/article/search-and-search-views?language=en_US | Indexed: “Click the star icon to save your search view… Starred items in your sidebar”; parameters update as work changes |
| Copy Search URL / Save Report (community + Help patterns) | Help / forum indexed via search | Share via URL / Save Report — treat share details as **PUBLIC-DOC (partial)** until Help body re-fetchable |

**Build map:** Named saved searches/reports → **BEHIND candidates**.

### Custom fields in filters — PUBLIC-DOC

| Claim | URL | Quote / snippet |
| --- | --- | --- |
| Add Custom Field in Advanced Search | https://asana.com/resources/asana-tips-advanced-search-reporting | “select Add Custom Field so you can sort by high priority tasks” |
| Field library requirement (Help) | https://help.asana.com/s/article/search-and-search-views?language=en_US | Indexed: “The custom field must be in your organization's field library to show up in the advanced search options.” |

**Build map:** Custom fields in filters → **BEHIND candidate**.

---

## 6. Zoho Projects

**Primary docs (official Help URLs):** [Project Custom View](https://help.zoho.com/portal/en/kb/projects/projects/project-operations/articles/project-custom-view) · [Issue Custom Views](https://help.zoho.com/portal/en/kb/projects/issue-tracker/issue-tracker-operations/articles/create-custom-view) · [Task List View](https://help.zoho.com/portal/en/kb/projects/tasks/tasks/tasks-introduction/articles/task-list-view) · [Time Logs Custom Views](https://help.zoho.com/portal/en/kb/projects/timesheetsandtimelogs/manage-timelogs/articles/time-log-custom-views)

**Fetch limitation (2026-10-01):** Zoho Help Center pages are SPA-rendered; WebFetch/curl returned shell JS without article body. Claims below are **PUBLIC-DOC from WebSearch-indexed official Help snippets only** — thinner than Linear/ClickUp/Jira/monday. Do not invent UI field pickers.

### Filter / search / view fields listed — PUBLIC-DOC (thin)

| Claim | URL | Quote / snippet (indexed) |
| --- | --- | --- |
| Create Custom View for projects with criteria | https://help.zoho.com/portal/en/kb/projects/projects/project-operations/articles/project-custom-view | Indexed: create custom view; define criteria using fields (incl. custom fields) to filter project list |
| Issue Custom Views via Specify Criteria | https://help.zoho.com/portal/en/kb/projects/issue-tracker/issue-tracker-operations/articles/create-custom-view | Indexed: Issues List/Kanban → Create Custom View → Specify Criteria; choose issue field + operator (e.g. contains) + value |
| Task custom views from task view dropdown | https://help.zoho.com/portal/en/kb/projects/tasks/tasks/tasks-introduction/articles/task-list-view | Indexed: Tasks tab → view dropdown → Create Custom View; criteria with AND/OR groups; columns; share/accessibility |
| Custom fields usable in project layouts/views | https://help.zoho.com/portal/en/kb/projects/settings-in-zoho-projects/customization/layouts-fields/articles/project-layouts-and-fields | Indexed: custom fields for projects (plan-gated Premium+) |

**Build map:** Status/Assignee/Due/Priority likely available as criteria fields (common Zoho modules) but **not quote-verified in fetched body** → mark **UNKNOWN detail / PARITY-seeking hypothesis**, not UI-VERIFIED. Labels/Epic/Release → **BEHIND candidates** pending richer docs.

### Operators — PUBLIC-DOC (thin)

| Operator / combinator | URL | Quote / snippet (indexed) |
| --- | --- | --- |
| Match all (AND) / Match any (OR) | https://help.zoho.com/portal/en/kb/projects/projects/project-operations/articles/project-custom-view | Indexed: Match all = AND; Match any = OR; nestable criteria patterns |
| contains (example operator) | https://help.zoho.com/portal/en/kb/projects/issue-tracker/issue-tracker-operations/articles/create-custom-view | Indexed: operator “contains” cited in Issue Custom Views flow |
| Up to ~15 criteria (time-log views analog) | https://help.zoho.com/portal/en/kb/projects/timesheetsandtimelogs/manage-timelogs/articles/time-log-custom-views | Indexed: up to 15 criteria in a custom view (time logs article) — confirm for issues/tasks before selling |

**Build map:** AND–OR Match all/any → **BEHIND candidate**. Relative-date operator list → **UNKNOWN** (not in indexed snippets).

### Saved views / share — PUBLIC-DOC (thin)

| Capability | URL | Quote / snippet (indexed) |
| --- | --- | --- |
| Named Custom Views (project/issue/task) | Project / Issue / Task custom view Help URLs above | Indexed: name view, save, configure sharing and accessibility (personal vs shared) |

**Build map:** Named saved custom views → **BEHIND candidates**.

### Custom fields in filters — PUBLIC-DOC (thin)

| Claim | URL | Quote / snippet (indexed) |
| --- | --- | --- |
| Custom fields in project custom-view criteria | https://help.zoho.com/portal/en/kb/projects/projects/project-operations/articles/project-custom-view | Indexed: criteria can use custom fields |
| Layouts & fields customization | https://help.zoho.com/portal/en/kb/projects/settings-in-zoho-projects/customization/layouts-fields/articles/project-layouts-and-fields | Indexed: project custom fields (plan limits) |

**Build map:** Custom fields in filters → **BEHIND candidate** (docs assert existence; operator matrix not fully cited).

---

## Rollup counts (this inventory)

| Metric | Count |
| --- | --- |
| Direct products sectioned | **6** (Linear, ClickUp, Jira Cloud, monday.com, Asana, Zoho Projects) |
| Claim rows labeled **PUBLIC-DOC** (approx. table rows across all sections) | **~95** |
| Rows with full WebFetch quote body | **~75** (Linear, ClickUp, Jira, monday strong) |
| Rows thin / indexed-Help only (fetch blocked) | **~20** (Asana Help SPA partial; Zoho Help SPA) |
| UI-VERIFIED rows | **0** (intentional) |
| Build BEHIND-candidate themes reinforced | Labels UX-026, Epic UX-027, Release, AND–OR, relative dates, custom fields in filters, named saved views |
| Build PARITY-seeking themes | Status, Priority, Type, Assignee, Cycle/Sprint, Due |

### Caveats for PM
1. Do **not** upgrade any row to UI-VERIFIED until a signed-in walk succeeds past captcha/crash gates.
2. Zoho + Asana Help Center bodies were partially inaccessible to fetch tooling on 2026-10-01 — re-fetch when ungated; prefer Help article text over marketing resources where both exist.
3. monday.com documents that per-column **condition** lists live in a UI key — do not invent operator names beyond “is”/AND/OR/relative week language quoted above.
4. Linear Filters docs do not publish a complete custom-field operator matrix; treat CF filter depth as feature-dependent.

---

*Generated for StreamlineOS Build competitor-deep · access date 2026-10-01 · evidence class PUBLIC-DOC only.*
