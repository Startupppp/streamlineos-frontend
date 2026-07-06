export interface WorkflowTransition {
  id: number;
  projectId: number;
  fromStatusId: number | null;
  toStatusId: number;
  name: string | null;
  requiresApproval: boolean;
  requiredFields: string[];
  allowedRoles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransitionInput {
  fromStatusId?: number | null;
  toStatusId: number;
  name?: string;
  requiresApproval?: boolean;
  requiredFields?: string[];
  allowedRoles?: string[];
}

export interface UpdateTransitionInput {
  fromStatusId?: number | null;
  toStatusId?: number;
  name?: string;
  requiresApproval?: boolean;
  requiredFields?: string[];
  allowedRoles?: string[];
}

export interface UpdateWipInput {
  wipLimit: number | null;
}
