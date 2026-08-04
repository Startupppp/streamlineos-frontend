export type WorkerStatus = "ACTIVE" | "INACTIVE" | "EXITED";

export type WorkerType =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACTOR"
  | "CONSULTANT"
  | "INTERN"
  | "TEMPORARY"
  | "AGENCY"
  | "FREELANCER";

export type EngagementStatus =
  | "PLANNED"
  | "ACTIVE"
  | "COMPLETED"
  | "TERMINATED"
  | "CANCELLED";

export interface Worker {
  workerId: string;
  organizationId: string;
  organizationPersonId: string;
  workerNumber: string | null;
  status: WorkerStatus;
  isPayee: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  workEmail: string | null;
  avatarUrl: string | null;
  userId: string | null;
}

export interface WorkerEngagement {
  workerEngagementId: string;
  organizationId: string;
  workerId: string;
  startsOn: string;
  endsOn: string | null;
  workerType: WorkerType;
  status: EngagementStatus;
  isPrimary: boolean;
  departmentId: string | null;
  businessUnitId: string | null;
  branchId: string | null;
  locationId: string | null;
  teamId: string | null;
  managerEngagementId: string | null;
  designation: string | null;
  jobRoleId: number | null;
  jobLevelId: number | null;
  employmentTypeId: number | null;
  probationEndsOn: string | null;
  noticePeriodDays: number | null;
  terminationReason: string | null;
  terminationNotes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface WorkersPage {
  data: Worker[];
  pagination: WorkerPagination;
}

export interface CreateWorkerInput {
  organizationPersonId: string;
  workerNumber?: string;
  isPayee?: boolean;
}

export interface CreateEngagementInput {
  workerId: string;
  startsOn: string;
  endsOn?: string;
  workerType: WorkerType;
  isPrimary?: boolean;
  designation?: string;
}

export interface TerminateEngagementInput {
  terminationReason?: string;
  terminationNotes?: string;
  endsOn?: string;
}
