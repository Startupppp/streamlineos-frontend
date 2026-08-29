import { humanResourcesQueryKeys } from "./query-keys/human-resources";
import { customerWorkQueryKeys } from "./query-keys/customer-work";
import { buildWorkQueryKeys } from "./query-keys/build-work";
import { collaborationQueryKeys } from "./query-keys/collaboration";
import { platformCoreQueryKeys } from "./query-keys/platform-core";
import { accessAndCrmQueryKeys } from "./query-keys/access-and-crm";
import { accountingAndSupportQueryKeys } from "./query-keys/accounting-and-support";
import { knowledgeAndSurveysQueryKeys } from "./query-keys/knowledge-and-surveys";
import { supportAndWorkflowsQueryKeys } from "./query-keys/support-and-workflows";
import { platformHierarchyQueryKeys } from "./query-keys/platform-hierarchy";
import { inventoryQueryKeys } from "./query-keys/inventory";
import { inventoryGenealogyQueryKeys } from "./query-keys/inventory-genealogy";
import { inventoryPickingQueryKeys } from "./query-keys/inventory-picking";
import { inventoryPlanningQueryKeys } from "./query-keys/inventory-planning";
import { inventoryPackingQueryKeys } from "./query-keys/inventory-packing";
import { inventoryPutawayQueryKeys } from "./query-keys/inventory-putaway";
import { inventoryQualityPlanQueryKeys } from "./query-keys/inventory-quality-plans";
import { inventoryRecallSimulationQueryKeys } from "./query-keys/inventory-recall-simulation";
import { inventoryReturnsQueryKeys } from "./query-keys/inventory-returns";
import { inventoryVendorScorecardQueryKeys } from "./query-keys/inventory-vendor-scorecard";
import { inventoryCopilotQueryKeys } from "./query-keys/inventory-copilot";
import { inventoryOutboxQueryKeys } from "./query-keys/inventory-outbox";
import { usersAndCommerceQueryKeys } from "./query-keys/users-and-commerce";
import { payrollQueryKeys } from "./query-keys/payroll";
import { growthAndSignQueryKeys } from "./query-keys/growth-and-sign";
import { directoryAndOwnershipQueryKeys } from "./query-keys/directory-and-ownership";

export const queryKeys = {
  ...humanResourcesQueryKeys,
  ...customerWorkQueryKeys,
  ...buildWorkQueryKeys,
  ...collaborationQueryKeys,
  ...platformCoreQueryKeys,
  ...accessAndCrmQueryKeys,
  ...accountingAndSupportQueryKeys,
  ...knowledgeAndSurveysQueryKeys,
  ...supportAndWorkflowsQueryKeys,
  ...platformHierarchyQueryKeys,
  ...inventoryQueryKeys,
  ...inventoryGenealogyQueryKeys,
  ...inventoryPickingQueryKeys,
  ...inventoryPlanningQueryKeys,
  ...inventoryPackingQueryKeys,
  ...inventoryPutawayQueryKeys,
  ...inventoryQualityPlanQueryKeys,
  ...inventoryRecallSimulationQueryKeys,
  ...inventoryReturnsQueryKeys,
  ...inventoryVendorScorecardQueryKeys,
  ...inventoryCopilotQueryKeys,
  ...inventoryOutboxQueryKeys,
  ...usersAndCommerceQueryKeys,
  ...payrollQueryKeys,
  ...growthAndSignQueryKeys,
  ...directoryAndOwnershipQueryKeys,
} as const;
