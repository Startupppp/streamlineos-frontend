import type { DbEnumMember } from "@/contracts/db-enums.generated";
import type {
  ApprovalsInboxGetInboxResponse,
  BuildApprovalsListApprovalsResponse,
  BuildApprovalsGetApprovalResponse,
  BuildApprovalsCreateApprovalBody,
  BuildApprovalsDecideApprovalBody,
  BuildApprovalsUpdateApprovalBody,
  BuildApprovalsSoftDeleteApprovalBody,
} from "@/contracts/build-contracts.generated";

export type ApprovalEntityType = DbEnumMember<"approval_entity_type">;
export type ApprovalStatus = DbEnumMember<"approval_status">;
export type ApprovalInboxItem = ApprovalsInboxGetInboxResponse["data"][number];
export type Approval = BuildApprovalsListApprovalsResponse["data"][number];
export type ApprovalDetail = BuildApprovalsGetApprovalResponse;
export type CreateApprovalInput = BuildApprovalsCreateApprovalBody;
export type DecideApprovalInput = BuildApprovalsDecideApprovalBody;
export type UpdateApprovalInput = BuildApprovalsUpdateApprovalBody;
export type DeleteApprovalInput = BuildApprovalsSoftDeleteApprovalBody;
