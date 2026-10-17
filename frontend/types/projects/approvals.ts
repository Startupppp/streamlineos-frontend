import type { DbEnumMember } from "@/contracts/db-enums.generated";
import type {
  ApprovalsInboxGetInboxResponse,
  BuildApprovalsListApprovalsResponse,
  BuildApprovalsCreateApprovalBody,
} from "@/contracts/build-contracts.generated";

export type ApprovalEntityType = DbEnumMember<"approval_entity_type">;
export type ApprovalStatus = DbEnumMember<"approval_status">;
export type ApprovalInboxItem = ApprovalsInboxGetInboxResponse["data"][number];
export type Approval = BuildApprovalsListApprovalsResponse["data"][number];
export type CreateApprovalInput = BuildApprovalsCreateApprovalBody;
