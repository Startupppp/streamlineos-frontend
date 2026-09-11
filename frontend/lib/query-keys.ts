import { humanResourcesQueryKeys } from "./query-keys/human-resources";
import { customerWorkQueryKeys } from "./query-keys/customer-work";
import { buildWorkQueryKeys } from "./query-keys/build-work";
import { collaborationQueryKeys } from "./query-keys/collaboration";
import { platformCoreQueryKeys } from "./query-keys/platform-core";
import { accessAndCrmQueryKeys } from "./query-keys/access-and-crm";
import { accountingAndSupportQueryKeys } from "./query-keys/accounting-and-support";
import { accountingLedgerQueryKeys } from "./query-keys/accounting-ledger";
import { accountingReportsQueryKeys } from "./query-keys/accounting-reports";
import { accountingBankingQueryKeys } from "./query-keys/accounting-banking";
import { accountingApQueryKeys } from "./query-keys/accounting-ap";
import { accountingArQueryKeys } from "./query-keys/accounting-ar";
import { knowledgeAndSurveysQueryKeys } from "./query-keys/knowledge-and-surveys";
import { supportAndWorkflowsQueryKeys } from "./query-keys/support-and-workflows";
import { platformHierarchyQueryKeys } from "./query-keys/platform-hierarchy";
import { inventoryQueryKeys } from "./query-keys/inventory";
import { inventoryGenealogyQueryKeys } from "./query-keys/inventory-genealogy";
import { inventoryPickingQueryKeys } from "./query-keys/inventory-picking";
import { inventoryPlanningQueryKeys } from "./query-keys/inventory-planning";
import { inventoryPackingQueryKeys } from "./query-keys/inventory-packing";
import { inventoryPutawayQueryKeys } from "./query-keys/inventory-putaway";
import { inventoryTransitQueryKeys } from "./query-keys/inventory-transit";
import { inventoryGlReconQueryKeys } from "./query-keys/inventory-gl-recon";
import { inventorySystemHealthQueryKeys } from "./query-keys/inventory-system-health";
import { inventoryStagedImportQueryKeys } from "./query-keys/inventory-staged-import";
import { inventoryLandedCostQueryKeys } from "./query-keys/inventory-landed-cost";
import { inventoryAuditExportQueryKeys } from "./query-keys/inventory-audit-export";
import { inventoryChannelSnapshotQueryKeys } from "./query-keys/inventory-channel-snapshots";
import { inventoryQualityPlanQueryKeys } from "./query-keys/inventory-quality-plans";
import { inventoryRecallSimulationQueryKeys } from "./query-keys/inventory-recall-simulation";
import { inventoryReturnsQueryKeys } from "./query-keys/inventory-returns";
import { inventoryVendorScorecardQueryKeys } from "./query-keys/inventory-vendor-scorecard";
import { inventoryCopilotQueryKeys } from "./query-keys/inventory-copilot";
import { inventoryReportBuilderQueryKeys } from "./query-keys/inventory-report-builder";
import { inventoryAiReviewQueryKeys } from "./query-keys/inventory-ai-review";
import { inventoryOutboxQueryKeys } from "./query-keys/inventory-outbox";
import { inventoryOpsMetricsQueryKeys } from "./query-keys/inventory-ops-metrics";
import { inventoryMaterialsQueryKeys } from "./query-keys/inventory-materials";
import { usersAndCommerceQueryKeys } from "./query-keys/users-and-commerce";
import { payrollQueryKeys } from "./query-keys/payroll";
import { growthAndSignQueryKeys } from "./query-keys/growth-and-sign";
import { directoryAndOwnershipQueryKeys } from "./query-keys/directory-and-ownership";
import { hrEngagementQueryKeys } from "./query-keys/hr-engagement";

export const queryKeys = {
  ...humanResourcesQueryKeys,
  ...customerWorkQueryKeys,
  ...buildWorkQueryKeys,
  ...collaborationQueryKeys,
  ...platformCoreQueryKeys,
  ...accessAndCrmQueryKeys,
  ...accountingAndSupportQueryKeys,
  ...accountingLedgerQueryKeys,
  ...accountingReportsQueryKeys,
  ...accountingBankingQueryKeys,
  ...accountingApQueryKeys,
  ...accountingArQueryKeys,
  ...knowledgeAndSurveysQueryKeys,
  ...supportAndWorkflowsQueryKeys,
  ...platformHierarchyQueryKeys,
  ...inventoryQueryKeys,
  ...inventoryGenealogyQueryKeys,
  ...inventoryPickingQueryKeys,
  ...inventoryPlanningQueryKeys,
  ...inventoryPackingQueryKeys,
  ...inventoryPutawayQueryKeys,
  ...inventoryTransitQueryKeys,
  ...inventoryGlReconQueryKeys,
  ...inventorySystemHealthQueryKeys,
  ...inventoryStagedImportQueryKeys,
  ...inventoryLandedCostQueryKeys,
  ...inventoryAuditExportQueryKeys,
  ...inventoryChannelSnapshotQueryKeys,
  ...inventoryQualityPlanQueryKeys,
  ...inventoryRecallSimulationQueryKeys,
  ...inventoryReturnsQueryKeys,
  ...inventoryVendorScorecardQueryKeys,
  ...inventoryCopilotQueryKeys,
  ...inventoryReportBuilderQueryKeys,
  ...inventoryAiReviewQueryKeys,
  ...inventoryOutboxQueryKeys,
  ...inventoryOpsMetricsQueryKeys,
  ...inventoryMaterialsQueryKeys,
  ...usersAndCommerceQueryKeys,
  ...payrollQueryKeys,
  ...growthAndSignQueryKeys,
  ...directoryAndOwnershipQueryKeys,
  ...hrEngagementQueryKeys,
} as const;
