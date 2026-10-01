#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));
const OPENAPI_PATH = join(FRONTEND_ROOT, "contracts", "openapi.json");
const OUTPUT_PATH = join(FRONTEND_ROOT, "contracts", "build-contracts.generated.ts");

function normalise(text) {
  return text.replace(/\r\n/g, "\n");
}

function sha256hex(content) {
  return createHash("sha256").update(normalise(content)).digest("hex");
}

function pointer(root, ref) {
  if (typeof ref !== "string" || !ref.startsWith("#/")) return undefined;
  let current = root;
  for (const rawSegment of ref.slice(2).split("/")) {
    const segment = rawSegment.replaceAll("~1", "/").replaceAll("~0", "~");
    if (current == null || typeof current !== "object") return undefined;
    current = current[segment];
  }
  return current;
}

function deref(node, root) {
  let current = node;
  let hops = 0;
  while (current != null && typeof current === "object" && typeof current.$ref === "string" && hops < 8) {
    current = pointer(root, current.$ref);
    hops += 1;
  }
  return current;
}

function isNullBranch(node, root) {
  const r = deref(node, root);
  return r != null && typeof r === "object" && r.type === "null";
}

function zodForNode(node, root, depth) {
  if (node == null) return "z.unknown()";
  const n = deref(node, root);
  if (n == null) return "z.unknown()";

  if (n.anyOf || n.oneOf) {
    const branches = n.anyOf ?? n.oneOf;
    const nonNull = branches.filter((b) => !isNullBranch(b, root));
    if (nonNull.length === 0) return "z.null()";
    const hasNull = branches.length > nonNull.length;
    const inner =
      nonNull.length === 1
        ? zodForNode(nonNull[0], root, depth)
        : "z.union([" + nonNull.map((b) => zodForNode(b, root, depth)).join(", ") + "])";
    return hasNull ? inner + ".nullable()" : inner;
  }

  if (n.allOf) {
    const merged = { type: "object", properties: {}, required: [] };
    for (const part of n.allOf) {
      const r = deref(part, root);
      if (r == null || typeof r !== "object") continue;
      Object.assign(merged.properties, r.properties ?? {});
      merged.required.push(...(r.required ?? []));
    }
    Object.assign(merged.properties, n.properties ?? {});
    merged.required.push(...(n.required ?? []));
    return zodForNode(merged, root, depth);
  }

  if (Array.isArray(n.enum)) {
    return "z.enum([" + n.enum.map((m) => JSON.stringify(m)).join(", ") + "])";
  }

  if (n.type === "array" || n.items !== undefined) {
    const items = n.items != null ? zodForNode(n.items, root, depth) : "z.unknown()";
    const maxCap = typeof n.maxItems === "number" ? `.max(${n.maxItems})` : "";
    return `z.array(${items})${maxCap}`;
  }

  if (n.type === "object" || n.properties != null) {
    if (n.properties == null) {
      if (n.additionalProperties != null && typeof n.additionalProperties === "object") {
        return `z.record(z.string(), ${zodForNode(n.additionalProperties, root, depth)})`;
      }
      return "z.record(z.string(), z.unknown())";
    }
    const req = new Set(n.required ?? []);
    const pad = "  ".repeat(depth + 1);
    const close = "  ".repeat(depth);
    const fields = Object.entries(n.properties).map(([k, v]) => {
      const zod = zodForNode(v, root, depth + 1);
      const opt = req.has(k) ? "" : ".optional()";
      return `${pad}${k}: ${zod}${opt}`;
    });
    return `z.object({\n${fields.join(",\n")},\n${close}})`;
  }

  if (n.type === "integer") return "z.number().int()";
  if (n.type === "number") return "z.number()";
  if (n.type === "string") return "z.string()";
  if (n.type === "boolean") return "z.boolean()";
  if (n.type === "null") return "z.null()";

  return "z.unknown()";
}

function unwrapEnvelope(schema, root) {
  const n = deref(schema, root);
  if (n?.properties?.success != null && n?.properties?.data != null) return n.properties.data;
  return schema;
}

function getOperationResponseSchema(document, path, method) {
  const op = document.paths?.[path]?.[method];
  if (!op) return null;
  for (const code of ["200", "201"]) {
    const s = op.responses?.[code]?.content?.["application/json"]?.schema;
    if (s != null) return s;
  }
  return null;
}

const COVERED_OPERATIONS = [
  { export: "genProjectListPageSchema", path: "/build", method: "get" },
  { export: "genProjectRowSchema", path: "/build/{projectId}", method: "get" },
  { export: "genProjectAnalyticsSchema", path: "/build/{projectId}/analytics", method: "get" },
  { export: "genProjectApprovalsSchema", path: "/build/{projectId}/approvals", method: "get" },
  { export: "genProjectBugsSchema", path: "/build/{projectId}/bugs", method: "get" },
  { export: "genChangeRequestListSchema", path: "/build/{projectId}/change-requests", method: "get" },
  { export: "genClientPortalSettingsSchema", path: "/build/{projectId}/client-portal/settings", method: "get" },
  { export: "genClientPortalPreviewSchema", path: "/build/{projectId}/client-portal/preview", method: "get" },
  { export: "genCustomStateListSchema", path: "/build/{projectId}/custom-states", method: "get" },
  { export: "genCustomFieldListSchema", path: "/build/{projectId}/custom-fields", method: "get" },
  { export: "genCycleListSchema", path: "/build/{projectId}/cycles", method: "get" },
  { export: "genDecisionPageSchema", path: "/build/{projectId}/decisions", method: "get" },
  { export: "genProjectFilesSchema", path: "/build/{projectId}/files", method: "get" },
  { export: "genFormListSchema", path: "/build/{projectId}/forms", method: "get" },
  { export: "genFormRowSchema", path: "/build/{projectId}/forms/{formId}", method: "get" },
  { export: "genIncidentPageSchema", path: "/build/{projectId}/incidents", method: "get" },
  { export: "genProjectIntakeSchema", path: "/build/{projectId}/intake", method: "get" },
  { export: "genProjectLabelsSchema", path: "/build/{projectId}/labels", method: "get" },
  { export: "genMeetingListSchema", path: "/build/{projectId}/meetings", method: "get" },
  { export: "genMeetingDetailSchema", path: "/build/{projectId}/meetings/{meetingId}", method: "get" },
  { export: "genBuildMemberPageSchema", path: "/build/{projectId}/members", method: "get" },
  { export: "genMilestoneListSchema", path: "/build/{projectId}/milestones", method: "get" },
  { export: "genModuleListSchema", path: "/build/{projectId}/modules", method: "get" },
  { export: "genReleasePageSchema", path: "/build/{projectId}/releases", method: "get" },
  { export: "genBurnupReportSchema", path: "/build/{projectId}/reports/burnup", method: "get" },
  { export: "genCfdReportSchema", path: "/build/{projectId}/reports/cfd", method: "get" },
  { export: "genCriticalPathSchema", path: "/build/{projectId}/reports/critical-path", method: "get" },
  { export: "genCycleTimeSchema", path: "/build/{projectId}/reports/cycle-time", method: "get" },
  { export: "genLeadTimeSchema", path: "/build/{projectId}/reports/lead-time", method: "get" },
  { export: "genVelocityReportSchema", path: "/build/{projectId}/reports/velocity", method: "get" },
  { export: "genRiskPageSchema", path: "/build/{projectId}/risks", method: "get" },
  { export: "genRiskStatsSchema", path: "/build/{projectId}/risks/stats", method: "get" },
  { export: "genProjectRosterSchema", path: "/build/{projectId}/roster", method: "get" },
  { export: "genIterationSettingsSchema", path: "/build/{projectId}/settings/iterations", method: "get" },
  { export: "genTicketListPageSchema", path: "/build/{projectId}/tickets", method: "get" },
  { export: "genTicketDetailWireSchema", path: "/build/{projectId}/tickets/{ticketId}", method: "get" },
  { export: "genTicketRelationListSchema", path: "/build/{projectId}/tickets/{ticketId}/relations", method: "get" },
  { export: "genTicketColumnCountsSchema", path: "/build/{projectId}/tickets/column-counts", method: "get" },
  { export: "genProjectUpdatesSchema", path: "/build/{projectId}/updates", method: "get" },
  { export: "genProjectViewListSchema", path: "/build/{projectId}/views", method: "get" },
  { export: "genWebhookPageSchema", path: "/build/{projectId}/webhooks", method: "get" },
  { export: "genWebhookDeliveryListSchema", path: "/build/{projectId}/webhooks/{webhookId}/deliveries", method: "get" },
  { export: "genWhiteboardDetailSchema", path: "/build/{projectId}/whiteboards/{whiteboardId}", method: "get" },
  { export: "genWorkflowTransitionsSchema", path: "/build/{projectId}/workflow/transitions", method: "get" },
  { export: "genWorkloadCapacitySchema", path: "/build/{projectId}/workload/capacity", method: "get" },
  { export: "genAutomationPageSchema", path: "/build/{projectId}/automations", method: "get" },
  { export: "genAgentPulseTopSignalSchema", path: "/build/agent-pulse/top-signal", method: "get" },
  { export: "genAllWorkPageSchema", path: "/build/all-work", method: "get" },
  { export: "genApprovalsInboxSchema", path: "/build/approvals/inbox", method: "get" },
  { export: "genChangelogPageSchema", path: "/build/changelog", method: "get" },
  { export: "genCommentDraftListSchema", path: "/build/comment-drafts/mine", method: "get" },
  { export: "genFeedbackPageSchema", path: "/build/feedback", method: "get" },
  { export: "genTicketLabelListSchema", path: "/build/labels", method: "get" },
  { export: "genBuildMembersSchema", path: "/build/members", method: "get" },
  { export: "genOrgCustomStateListSchema", path: "/build/org-custom-states", method: "get" },
  { export: "genPortalProjectListSchema", path: "/build/portal/projects", method: "get" },
  { export: "genPortalProjectOverviewSchema", path: "/build/portal/projects/{projectId}/overview", method: "get" },
  { export: "genPortalChangeRequestListSchema", path: "/build/portal/projects/{projectId}/change-requests", method: "get" },
  { export: "genPortfolioListSchema", path: "/build/portfolios", method: "get" },
  { export: "genProgramListSchema", path: "/build/programs", method: "get" },
  { export: "genOrgReleaseListSchema", path: "/build/releases", method: "get" },
  { export: "genOrgRiskPageSchema", path: "/build/risks", method: "get" },
  { export: "genRoadmapPageSchema", path: "/build/roadmap", method: "get" },
  { export: "genRoadmapPublicationSchema", path: "/build/roadmap-publication", method: "get" },
  { export: "genScopeDirectorySearchSchema", path: "/build/scope-directory/search", method: "get" },
  { export: "genTicketSearchSchema", path: "/build/search/tickets", method: "get" },
  { export: "genTeamListSchema", path: "/build/teams", method: "get" },
  { export: "genTeamRowSchema", path: "/build/teams/{teamId}", method: "get" },
  { export: "genOrgViewListSchema", path: "/build/views", method: "get" },
];

export function generateContent(document, openapiHash) {
  const segments = ['import { z } from "zod";', "", `export const OPENAPI_HASH = "sha256:${openapiHash}" as const;`, ""];
  for (const op of COVERED_OPERATIONS) {
    const rawSchema = getOperationResponseSchema(document, op.path, op.method);
    const dataSchema = rawSchema == null ? null : unwrapEnvelope(rawSchema, document);
    const zodCode = dataSchema == null ? "z.unknown()" : zodForNode(dataSchema, document, 0);
    segments.push(`export const ${op.export} = ${zodCode};`, "");
  }
  return segments.join("\n");
}

function main() {
  if (!existsSync(OPENAPI_PATH)) {
    console.error(`generate-build-contracts: contracts/openapi.json not found at ${OPENAPI_PATH}`);
    console.error("  Vendor it first: cp backend/openapi.json frontend/contracts/openapi.json");
    process.exit(1);
  }
  const raw = readFileSync(OPENAPI_PATH, "utf8");
  const hash = sha256hex(raw);
  const document = JSON.parse(raw);
  const content = generateContent(document, hash);
  writeFileSync(OUTPUT_PATH, content, "utf8");
  console.log(`Wrote contracts/build-contracts.generated.ts (openapi sha256: ${hash.slice(0, 16)}...)`);
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
