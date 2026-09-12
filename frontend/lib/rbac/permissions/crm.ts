import type { Permission } from "./types";

export const CRM_PERMISSIONS: Permission[] = [
  {
    name: "crm:leads:view",
    resource: "crm:leads",
    action: "view",
    description: "View CRM leads",
  },
  {
    name: "crm:leads:create",
    resource: "crm:leads",
    action: "create",
    description: "Create CRM leads",
  },
  {
    name: "crm:leads:update",
    resource: "crm:leads",
    action: "update",
    description: "Update CRM leads",
  },
  {
    name: "crm:leads:assign",
    resource: "crm:leads",
    action: "assign",
    description: "Assign CRM leads",
  },
  {
    name: "crm:leads:delete",
    resource: "crm:leads",
    action: "delete",
    description: "Delete CRM leads",
  },
  {
    name: "crm:targets:view",
    resource: "crm:targets",
    action: "view",
    description: "View targets",
  },
  {
    name: "crm:targets:manage",
    resource: "crm:targets",
    action: "manage",
    description: "Manage targets",
  },
  {
    name: "crm:reports:view",
    resource: "crm:reports",
    action: "view",
    description: "View CRM reports",
  },
  {
    name: "crm:reports:export",
    resource: "crm:reports",
    action: "export",
    description: "Export CRM reports",
  },
  { name: "crm:clients:read", resource: "crm:clients", action: "read", description: "View client accounts" },
  { name: "crm:clients:update", resource: "crm:clients", action: "update", description: "Update client accounts" },
  { name: "crm:incentives:read", resource: "crm:incentives", action: "read", description: "View incentives" },
  { name: "crm:incentives:approve", resource: "crm:incentives", action: "approve", description: "Approve incentives" },
  { name: "crm:contacts:view", resource: "crm:contacts", action: "view", description: "View CRM contacts" },
  { name: "crm:contacts:manage", resource: "crm:contacts", action: "manage", description: "Create and manage CRM contacts" },
  { name: "crm:organizations:view", resource: "crm:organizations", action: "view", description: "View CRM companies" },
  { name: "crm:organizations:manage", resource: "crm:organizations", action: "manage", description: "Create and manage CRM companies" },
  { name: "crm:organizations:merge", resource: "crm:organizations", action: "merge", description: "Merge duplicate CRM companies" },
  { name: "crm:assignment-rules:manage", resource: "crm:assignment-rules", action: "manage", description: "Manage lead assignment rules" },
  { name: "crm:automations:manage", resource: "crm:automations", action: "manage", description: "Manage CRM automation rules" },
  { name: "crm:campaigns:manage", resource: "crm:campaigns", action: "manage", description: "Create, update, and delete CRM campaigns" },
  { name: "crm:campaigns:view", resource: "crm:campaigns", action: "view", description: "View CRM campaigns, attribution reports, and ROI metrics" },
  { name: "crm:clients:manage", resource: "crm:clients", action: "manage", description: "Manage client accounts" },
  { name: "crm:customer360:view", resource: "crm:customer360", action: "view", description: "View Customer 360 aggregated profile (respects per-module permissions)" },
  { name: "crm:ingress:submit", resource: "crm:ingress", action: "submit", description: "Deliver a normalised inbound communication event into the CRM" },
  { name: "crm:autonomy:view", resource: "crm:autonomy", action: "view", description: "Review what the CRM decided and did on its own", baselineScope: "all" },
  { name: "crm:autonomy:reverse", resource: "crm:autonomy", action: "reverse", description: "Reverse an autonomous CRM action" },
  { name: "crm:autonomy:manage", resource: "crm:autonomy", action: "manage", description: "Turn autonomous CRM action types on or off for the organisation" },
  // Separate from `:manage`, which governs whether an action type runs at all.
  // This one governs whether the system may change stored customer data with
  // nobody watching, and that is a different thing to hand somebody.
  { name: "crm:autonomy:repair", resource: "crm:autonomy", action: "repair", description: "Choose which classes of data problem the CRM may repair unattended, and run the repair loop" },
  { name: "crm:imports:manage", resource: "crm:imports", action: "manage", description: "Bring a CRM export into StreamlineOS, and take an import back out" },
  { name: "crm:activities:view", resource: "crm:activities", action: "view", description: "Read the unified timeline of calls, emails, meetings, notes and tasks" },
  { name: "crm:activities:manage", resource: "crm:activities", action: "manage", description: "Log, edit, complete and remove activities on the timeline" },
  { name: "crm:data-quality:view", resource: "crm:data-quality", action: "view", description: "View CRM data quality dashboard" },
  { name: "crm:data-quality:assign", resource: "crm:data-quality", action: "assign", description: "Assign data quality findings to a person, or hand them back to the queue" },
  { name: "crm:data-quality:resolve", resource: "crm:data-quality", action: "resolve", description: "Resolve or dismiss data quality findings in bulk, reverse a resolution, and run the producers" },
  { name: "crm:issues:view", resource: "crm:issues", action: "view", description: "View internal issues, internal tasks and customer complaints" },
  { name: "crm:issues:manage", resource: "crm:issues", action: "manage", description: "Raise, edit and move internal issues, internal tasks and customer complaints" },
  { name: "crm:issues:escalate", resource: "crm:issues", action: "escalate", description: "Escalate an issue, task or complaint above its owner" },
  { name: "crm:email-templates:manage", resource: "crm:email-templates", action: "manage", description: "Manage CRM email templates" },
  { name: "crm:offer-fulfillment:create", resource: "crm:offer-fulfillment", action: "create", description: "Create CRM offer → Inventory SKU fulfillment mappings" },
  { name: "crm:offer-fulfillment:delete", resource: "crm:offer-fulfillment", action: "delete", description: "Delete CRM offer → Inventory SKU fulfillment mappings" },
  { name: "crm:offer-fulfillment:update", resource: "crm:offer-fulfillment", action: "update", description: "Update CRM offer → Inventory SKU fulfillment mappings" },
  { name: "crm:offer-fulfillment:view", resource: "crm:offer-fulfillment", action: "view", description: "View CRM offer → Inventory SKU fulfillment mappings" },
  { name: "crm:custom-fields:manage", resource: "crm:custom-fields", action: "manage", description: "Create, edit and remove CRM custom field definitions" },
  { name: "crm:custom-fields:view", resource: "crm:custom-fields", action: "view", description: "View CRM custom field definitions" },
  { name: "crm:products:manage", resource: "crm:products", action: "manage", description: "Manage the CRM product catalog" },
  { name: "crm:scoring-rules:manage", resource: "crm:scoring-rules", action: "manage", description: "Manage lead scoring rules" },
  { name: "crm:sequences:manage", resource: "crm:sequences", action: "manage", description: "Manage CRM email/call sequences" },
  { name: "crm:settings:manage", resource: "crm:settings", action: "manage", description: "Manage CRM configuration (pipelines, stages, options, validation rules, blueprints)" },
  { name: "crm:settings:view", resource: "crm:settings", action: "view", description: "View CRM configuration (pipelines, stages, options, validation rules, blueprints)" },
  { name: "crm:sla:manage", resource: "crm:sla", action: "manage", description: "Manage CRM SLA policies" },
  { name: "crm:tasks:update", resource: "crm:tasks", action: "update", description: "Update, complete, and snooze CRM tasks" },
  { name: "crm:tasks:view", resource: "crm:tasks", action: "view", description: "View CRM tasks and inbox" },
  { name: "crm:territories:manage", resource: "crm:territories", action: "manage", description: "Manage CRM territories" },
  { name: "crm:web-forms:manage", resource: "crm:web-forms", action: "manage", description: "Manage CRM web forms" },
  { name: "crm:deals:read", resource: "crm:deals", action: "read", description: "View CRM deals" },
  { name: "crm:deals:create", resource: "crm:deals", action: "create", description: "Create CRM deals" },
  { name: "crm:deals:update", resource: "crm:deals", action: "update", description: "Update CRM deals" },
  { name: "crm:deals:delete", resource: "crm:deals", action: "delete", description: "Delete CRM deals" },
  { name: "crm:deals:approve", resource: "crm:deals", action: "approve", description: "Approve or reject deal stage transitions" },
  { name: "crm:deals:forecast", resource: "crm:deals", action: "forecast", description: "Capture and view forecast snapshots" },
  { name: "crm:deals:manage", resource: "crm:deals", action: "manage", description: "Manage deal forecasts and overrides" },
  { name: "crm:pricebooks:manage", resource: "crm:pricebooks", action: "manage", description: "Manage price books and quote settings" },
  { name: "crm:quotes:read", resource: "crm:quotes", action: "read", description: "View CRM quotes" },
  { name: "crm:quotes:create", resource: "crm:quotes", action: "create", description: "Create CRM quotes" },
  { name: "crm:quotes:update", resource: "crm:quotes", action: "update", description: "Update CRM quotes" },
  { name: "crm:quotes:delete", resource: "crm:quotes", action: "delete", description: "Delete CRM quotes" },
  { name: "crm:quotes:approve", resource: "crm:quotes", action: "approve", description: "Approve or reject quotes requiring approval" },
  { name: "crm:ai:use", resource: "crm:ai", action: "use", description: "Use CRM AI features (scoring, enrichment, briefs, email generation)" },
  {
    name: "crm:call-analysis:view",
    resource: "crm:call-analysis",
    action: "view",
    description:
      "Read the analysis of a completed call: talk ratio, question rate, objections and how they were handled, competitors named, and whether a next step was committed",
  },
  {
    name: "crm:call-analysis:run",
    resource: "crm:call-analysis",
    action: "run",
    description:
      "Analyse a completed call's transcript. A transcript that has already been analysed is returned from cache and costs nothing",
  },
  {
    // `view-team`, not `team-view`: the backend seeds every `:view`/`:read` key
    // to CRM_MODULE_MEMBER, so the other spelling would hand every rep the whole
    // team's calls. Keep the suffix in step with `rbac/permissions/crm.ts`.
    name: "crm:call-analysis:view-team",
    resource: "crm:call-analysis",
    action: "view-team",
    description:
      "Read call analyses for calls you were not on, once the rep has shared one or their private window has elapsed, and see the team's coaching digest",
  },
  {
    name: "crm:commission-plans:view",
    resource: "crm:commission-plans",
    action: "view",
    description: "View commission plans and the version in force on a given date",
  },
  {
    name: "crm:commission-plans:manage",
    resource: "crm:commission-plans",
    action: "manage",
    description: "Define commission plans, seal plan versions, and assign reps to them",
  },
  {
    // Also gates the accrual reads. An accrual is a set of earnings summed, so a
    // key that granted the total while withholding the parts would be a
    // permission to see a number nobody could check.
    name: "crm:commission-earnings:view",
    resource: "crm:commission-earnings",
    action: "view",
    description: "View commission earnings and the accrual that decomposes them",
  },
  {
    name: "crm:commission-earnings:calculate",
    resource: "crm:commission-earnings",
    action: "calculate",
    description: "Calculate a commission earning for a deal, sealing the plan version it used",
  },
  {
    name: "crm:commission-earnings:approve",
    resource: "crm:commission-earnings",
    action: "approve",
    description: "Approve a commission earning for payout",
  },
  {
    name: "crm:commission-accruals:rebuild",
    resource: "crm:commission-accruals",
    action: "rebuild",
    description: "Re-derive the accrual decomposition over a bounded date range",
  },
  {
    name: "crm:call-recording-consent:attest",
    resource: "crm:call-recording-consent",
    action: "attest",
    description:
      "Record where a call took place and who consented to it being recorded, and read the ledger of calls the consent rule refused to analyse",
  },
  {
    name: "crm:lifecycle:view",
    resource: "crm:lifecycle",
    action: "view",
    description:
      "Read the renewal book: which customer contracts come up when, what they are worth, and the signals behind each risk score",
  },
  {
    name: "crm:lifecycle:manage",
    resource: "crm:lifecycle",
    action: "manage",
    description:
      "File a lifecycle signal, renew a customer contract into its next term, or close it as churned or cancelled",
  },
  {
    name: "crm:lifecycle-triggers:view",
    resource: "crm:lifecycle-triggers",
    action: "view",
    description:
      "Read the renewal and churn trigger log: which contracts opened a renewal conversation, why, and what the outbound loop answered",
  },
  {
    // `run`, not `:view`/`:read`: a sweep offers work to the autonomous outbound
    // loop, which is not an authority every CRM member should hold by default.
    name: "crm:lifecycle-triggers:run",
    resource: "crm:lifecycle-triggers",
    action: "run",
    description:
      "Run a renewal sweep: open renewal opportunities for contracts that are due or at risk, and offer them to the autonomous outbound loop",
  },
  {
    name: "crm:customer-health:view",
    resource: "crm:customer-health",
    action: "view",
    description:
      "Read customer health scores and the usage, engagement, support and sentiment inputs each one decomposes into",
  },
  {
    name: "crm:customer-health:manage",
    resource: "crm:customer-health",
    action: "manage",
    description:
      "Recompute a customer's health score from its sources and update the score shown on the customer record",
  },
  {
    name: "crm:reporting:view",
    resource: "crm:reporting",
    action: "view",
    description: "View saved report definitions and the log of report runs",
  },
  {
    name: "crm:reporting:manage",
    resource: "crm:reporting",
    action: "manage",
    description:
      "Create, edit and delete report definitions, and compile one without running it",
  },
  {
    name: "crm:reporting:run",
    resource: "crm:reporting",
    action: "run",
    description: "Run a report and return its rows",
  },
  {
    name: "crm:segments:view",
    resource: "crm:segments",
    action: "view",
    description:
      "View saved CRM segments and evaluate one to see how many parties it matches and who they are",
  },
  {
    name: "crm:segments:manage",
    resource: "crm:segments",
    action: "manage",
    description: "Create, edit and delete CRM segments",
  },
];
