export type CrmPipelineType =
  | "lead"
  | "deal"
  | "renewal"
  | "customer_success"
  | "partner"
  | "custom";

export interface CrmPipeline {
  id: string;
  type: CrmPipelineType;
  key: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

export type CrmStageType = "open" | "won" | "lost" | "archived";

export interface CrmPipelineStage {
  id: string;
  pipelineId: string;
  key: string;
  label: string;
  description: string | null;
  color: string;
  icon: string | null;
  sortOrder: number;
  probability: number;
  stageType: CrmStageType;
  isTerminal: boolean;
  slaHours: number | null;
  requiresApproval: boolean;
  requiredFields: string[];
  allowedNextStageKeys: string[] | null;
  isActive: boolean;
}

export interface CrmPipelineWithStages extends CrmPipeline {
  stages: CrmPipelineStage[];
}

export type CrmOptionType =
  | "lead_status"
  | "priority"
  | "source"
  | "lost_reason"
  | "activity_type"
  | "competitor"
  | "forecast_category"
  | "task_type";

export interface CrmOption {
  id: string;
  type: CrmOptionType;
  key: string;
  label: string;
  description: string | null;
  color: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  isTerminal: boolean;
  metadata: Record<string, unknown> | null;
}

export interface CrmMetadataResponse {
  pipelines: CrmPipelineWithStages[];
  options: Record<CrmOptionType, CrmOption[]>;
}

export type CrmValidationRuleType =
  | "required"
  | "email"
  | "phone"
  | "url"
  | "regex"
  | "numeric_min"
  | "numeric_max"
  | "currency_min"
  | "currency_max"
  | "date_not_past"
  | "date_not_future"
  | "unique"
  | "conditional_required"
  | "stage_required"
  | "source_required";

export type CrmValidationEntityType =
  | "lead"
  | "deal"
  | "contact"
  | "company"
  | "quote";

export interface CrmValidationRule {
  id: string;
  entityType: CrmValidationEntityType;
  field: string;
  ruleType: CrmValidationRuleType;
  config: Record<string, unknown> | null;
  pipelineId: string | null;
  stageKey: string | null;
  sourceKey: string | null;
  errorMessage: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface CrmBlueprint {
  id: string;
  name: string;
  description: string | null;
  pipelineId: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CrmBlueprintTransition {
  id: string;
  blueprintId: string;
  fromStageKey: string | null;
  toStageKey: string;
  requiredFields: string[];
  requiresApproval: boolean;
  approverRoles: string[];
  conditions: Record<string, unknown> | null;
  actions: Record<string, unknown> | null;
  isActive: boolean;
  sortOrder: number;
}

export type CrmColorToken =
  | "blue"
  | "emerald"
  | "amber"
  | "red"
  | "slate"
  | "cyan"
  | "sky"
  | "orange"
  | "pink"
  | "violet";
