import type { DbEnumMember } from "@/contracts/db-enums.generated";
import type {
  BuildApprovalsGetApprovalResponse,
  ApprovalsInboxGetInboxResponse,
  BuildApprovalsCreateApprovalBody,
  BuildApprovalsDecideApprovalBody,
  BuildApprovalsUpdateApprovalBody,
  BuildApprovalsSoftDeleteApprovalBody,
} from "@/contracts/build-contracts.generated";

export type ApprovalEntityType = DbEnumMember<"approval_entity_type">;
export type ApprovalStatus = DbEnumMember<"approval_status">;
export type Approval = BuildApprovalsGetApprovalResponse;
export type ApprovalInboxItem = ApprovalsInboxGetInboxResponse["data"][number];
export type CreateApprovalInput = BuildApprovalsCreateApprovalBody;
export type DecideApprovalInput = BuildApprovalsDecideApprovalBody;
export type UpdateApprovalInput = BuildApprovalsUpdateApprovalBody;
export type DeleteApprovalInput = BuildApprovalsSoftDeleteApprovalBody;