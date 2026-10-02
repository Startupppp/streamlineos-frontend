# Command Center and personal dashboards

Status: planned target

## Purpose

Command Center is the default Build landing page. It answers: what needs my attention, what is at risk, what changed, and what should I do next? It is personal by default, can also expose shared team dashboards, and provides drill-down evidence for every number.

## First-run experience

The user receives a persona-based default dashboard after onboarding. It is useful without configuration and contains no blank decorative cards.

| Persona | Default widgets |
|---|---|
| Freelancer | Today, waiting on client, due soon, unpaid/overdue projection, tracked time, recent client activity, quick create |
| Product manager | Intake to triage, goal health, current cycle, release confidence, feedback themes, decisions needed |
| Project manager | Portfolio health, milestone confidence, risks, blocked work, workload, pending approvals, change requests |
| Engineer/member | My focus, current cycle, blocked dependencies, reviews/QA, mentions, recent context |
| Content | Content calendar, briefs awaiting work, review queue, blocked assets, channel deadlines, performance links |
| Executive | Outcomes, delivery confidence, budget exposure, overdue decisions, top risks, client health |

## Layout

1. **Header**: dashboard name, scope, freshness, search, time window, share, edit, and AI brief.
2. **Attention strip**: up to five ranked, actionable exceptions; never vanity metrics.
3. **Widget grid**: 12-column desktop, 8-column tablet, single-column mobile.
4. **Quick action dock**: create ticket/request/project, log time, request approval, post update.
5. **Context drawer**: explains metric, filters, source, freshness, and permission gaps.

## Customization flow

1. Select `Customize` to enter edit mode without leaving the dashboard.
2. Add a widget from a searchable library grouped by My work, Delivery, Product, Client, Time and money, Team, Quality, or Custom.
3. Choose scope: me, selected people, team, project, portfolio, program, product, client, or organization. Only allowed scopes appear.
4. Choose a supported visualization and configure a filter using the shared filter builder.
5. Preview with real authorized data and a representative empty state.
6. Drag, resize, rename, or add a short note.
7. Save creates a new immutable layout version. Undo remains available until navigation; version history supports restore.

Autosave stores a private revisioned draft after 1 second of inactivity; publishing requires explicit Save. Draft failure preserves local input and shows Retry. Publishing a shared dashboard is an explicit action and requires dashboard-manage permission.

## Widget catalog

### Action widgets

- My focus: ordered work with start, snooze, complete, and open.
- Needs attention: blockers, overdue work, failed automation, breached SLA, stale approvals.
- Inbox: assignments, mentions, approvals, client responses, and system failures.
- Quick create: configured safe actions.
- AI brief: cited summary with proposed next actions; each action is reviewed before execution.

### Delivery widgets

- Work by status, priority, assignee, type, label, cycle, epic, milestone, or release.
- Cycle progress and scope change.
- Milestone confidence and dependency risk.
- Release readiness with unresolved blockers, QA, incidents, and approvals.
- Lead time, cycle time, throughput, aging, blocked time, and reopened work.
- Project/portfolio/program health.

### Product widgets

- Intake and triage aging.
- Feedback themes, source, customer segment, and linked revenue projection.
- Goal progress and confidence.
- Roadmap by outcome, product, team, or horizon.
- Decision queue and experiment/outcome tracking.

### Client and commercial widgets

- Client approvals waiting/overdue.
- Requests by state and SLA.
- Deliverables and recent updates.
- Budget consumed and forecast.
- Billable time projection.
- Invoice/payment status projection with `Open in Accounting`.

### People and quality widgets

- Workload and capacity.
- Unassigned or overloaded work.
- QA pass/fail/block rate.
- Incident trend and service health.
- Risk exposure and unresolved decisions.

## Widget card anatomy

Every widget has:

- title and optional owner-defined subtitle;
- explicit scope and date range;
- freshness timestamp and degraded-data indicator;
- primary value or ordered result set;
- comparison period only when meaningful;
- filter summary chips;
- `View source` drill-down;
- overflow menu: configure, duplicate, move, export permitted data, remove;
- loading skeleton sized to final layout;
- empty, filtered-empty, denied-partial, stale, and error states.

Charts must also expose a table view, legend, units, and accessible summary. Color is never the only signal.

## Dashboard and widget schema

```ts
type Dashboard = {
  id: string;
  organizationId: string;
  ownerUserId: string | null;
  visibility: "private" | "team" | "project" | "organization";
  scopeRef: { type: string; id: string } | null;
  name: string;
  personaTemplateId: string | null;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
};

type DashboardVersion = {
  dashboardId: string;
  version: number;
  layout: { columns: 12; items: DashboardLayoutItem[] };
  globalFilter: FilterEnvelope | null;
  createdBy: string;
  createdAt: string;
};

type DashboardLayoutItem = {
  widgetId: string;
  widgetType: string;
  x: number; y: number; width: number; height: number;
  titleOverride?: string;
  query: WidgetQuery;
  display: Record<string, unknown>;
};

type WidgetQuery = {
  metric: string;
  scope: { type: string; ids: string[] };
  filter?: FilterEnvelope;
  groupBy?: string[];
  timeWindow?: { kind: "relative" | "fixed"; value: string };
  compareTo?: string;
  limit?: number;
};
```

The stored query uses stable field IDs, not labels. Custom-field deletion is soft and widgets show a repair state until reconfigured.

## Interface design

Command Center should be a deep module with a small interface:

```ts
interface CommandCenter {
  loadDashboard(input: LoadDashboardInput): Promise<DashboardProjection>;
  saveDashboard(input: SaveDashboardInput): Promise<DashboardVersion>;
  queryWidget(input: QueryWidgetInput): Promise<WidgetResult>;
  restoreVersion(input: RestoreDashboardVersionInput): Promise<DashboardVersion>;
}
```

The implementation hides authorization, effective scope intersection, filter compilation, aggregation, partial-result handling, freshness, cache, and observability. Callers do not query arbitrary tables or supply raw SQL.

## Endpoint contract

- `GET /build/dashboards/default` returns the user's resolved landing dashboard.
- `GET /build/dashboards/:id` returns layout, capabilities, version, and widget descriptors.
- `POST /build/dashboards` creates private/shared dashboard after policy check.
- `PUT /build/dashboards/:id` requires `expectedVersion` and returns conflict details on stale write.
- `POST /build/dashboards/:id/restore` creates a new version from an old version.
- `POST /build/dashboard-query` accepts a bounded batch of visible widget queries and returns per-widget results/errors.

All writes accept an idempotency key. The batch endpoint caps widget count, scope count, time range, dimensions, and returned rows.

## Data access and authorization

- Resolve tenant, principal, enabled Build module, permission version, and data scope once per request.
- Intersect every widget's requested scope with effective scope before query compilation.
- Shared layout visibility does not grant visibility to its data.
- A dashboard copied by another user retains configuration but resolves data under the viewer's access.
- Partial access returns authorized totals plus `partial: true`; it never reveals hidden counts through subtraction.
- Exports reauthorize at job execution and delivery time.

## Cache strategy

| Layer | Key | TTL/invalidation |
|---|---|---|
| Layout | tenant:user/dashboard:version | Long lived; invalidate on layout write, visibility change, membership or permission version |
| Widget result | tenant:principal-scope-version:metric:normalized-query:data-version | Short TTL with event-driven namespace bump |
| Static catalog | locale:plan:enabled-modules:catalog-version | Long TTL; invalidate on catalog release |
| Browser | query key includes tenant, user, dashboard, version, normalized query | Stale-while-revalidate; clear on tenant switch and relevant mutation |

Do not cache shared results without principal/data-scope identity. Coalesce identical in-flight queries and cap concurrent widgets. Prioritize attention widgets above below-the-fold charts.

## AI brief

The AI brief receives only authorized widget results and cited record excerpts. It returns:

- a short current-state summary;
- ranked risks/opportunities with citations;
- proposed actions encoded as typed commands;
- missing or stale evidence.

Reading requires no extra confirmation. Mutations use normal command authorization. Permission, public sharing, deletion, bulk edits, payments, and external publication require explicit confirmation. The model never receives raw secrets, credentials, or inaccessible record existence.

## Performance targets

- Dashboard shell P95 under 1.5 seconds on broadband and under 2.5 seconds on representative mobile.
- Above-the-fold actionable widgets P95 under 2 seconds when warm and under 4 seconds when cold.
- No more than two initial network round trips after session context: dashboard projection plus bounded widget batch.
- Layout interaction maintains 60 fps on supported devices.
- A failed widget does not fail the dashboard.

## Acceptance criteria

- New users receive a useful persona dashboard with no configuration.
- Users can add, remove, resize, reorder, filter, preview, save, undo, and restore widgets.
- All values drill into the exact authorized records and active filters.
- Tenant/module/membership changes invalidate relevant layouts and results.
- Shared dashboards never widen data access.
- Empty, filtered-empty, partial, stale, error, and loading states are distinguishable.
- Desktop, tablet, and mobile layouts remain usable and recoverable.



## Locked dashboard limits and response contract

Maximum 24 widgets/layout; default six. Batch at most 12 visible widgets, four concurrent internal queries, 100 rows/widget, two grouping dimensions, 50 scope IDs and 366-day interactive range. Historical longer-range reports run as asynchronous jobs. Mobile renders the configured accessible reading order; drag/resize has keyboard controls and cannot overlap widgets.

GET default/id returns dashboardId, currentVersion, layout, widgetCatalogVersion, allowedActions and source freshness descriptors. POST dashboard-query accepts dashboardId, layoutVersion, requested widget IDs, FilterEnvelope v1 global filter and optional authorized time override. Server loads registered widget configurations rather than trusting arbitrary metrics/SQL. Results are keyed by widgetId with data, generatedAt, sourceRevision, scopeCompleteness, status and safe error. Each widget is independently successful/empty/stale/failed.

Global filters intersect each widget's local filter using AND under effective scope. Unknown scope dimensions return unsupported-filter warning for that widget rather than silently ignoring a constraint. Every metric has registered definition, units, supported dimensions and drill-down query. No financial/time widget appears when its owning module or required read permission is unavailable; show optional enable/connect action only to eligible admins.

Layout cache expires at version change; widget results use 15 seconds for attention and 30 seconds for ordinary metrics plus source namespace invalidation. Permission/grant revocation purges immediately. Sharing changes layout audience only. Restore creates a new version and never restores old access.

[Screen contracts](./screens/projects.md) and [screen data interfaces](../architecture/screen-data-contracts.md) use these exact endpoints and schemas.

