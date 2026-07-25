export interface HrEmployment {
  id: number;
  orgId?: string;
  personId?: number | string;
  employeeNumber: string | null;
  lifecycleStatus: string;
  workerType: string;
  departmentId: number | null;
  designation: string | null;
  joiningDate: string | null;
  probationEndDate?: string | null;
  confirmationDate?: string | null;
  isPrimary?: boolean;
  createdAt?: string;
  personFirstName?: string | null;
  personLastName?: string | null;
  personWorkEmail?: string | null;
}

export interface HrTimelineEntry {
  id: string;
  type: "status_transition" | "effective_change" | "audit";
  action: string;
  entityType: string;
  createdAt: string;
  data: Record<string, unknown>;
}

export interface HrTimelineResponse {
  data: HrTimelineEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface HrSensitiveBankDetails {
  accountNumber?: string;
  bankName?: string;
  branch?: string;
  ifsc?: string;
  swift?: string;
  accountHolder?: string;
  pfUanNumber?: string;
  esiIpNumber?: string;
  iban?: string;
  routingNumber?: string;
}

export interface HrSensitiveData {
  salaryAmountCents: number | null;
  salaryCurrency: string | null;
  salaryFrequency: string | null;
  bankDetails: HrSensitiveBankDetails | null;
  taxId: string | null;
  panNumber: string | null;
  nationalId: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  visaType: string | null;
  visaExpiry: string | null;
  medicalNotes: string | null;
  bloodGroup: string | null;
  bgvStatus: string | null;
}

export interface HrEffectiveDatedChange {
  id: number;
  orgId: string;
  employmentId: number;
  changeType: string;
  status: "PENDING" | "APPROVED" | "APPLIED" | "REJECTED" | "CANCELLED";
  effectiveFrom: string;
  effectiveTo: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown>;
  appliedAt: string | null;
  createdAt: string;
  createdBy: string;
}

export interface HrLocation {
  id: number;
  orgId: string;
  name: string;
  code: string | null;
  type: string;
  address: Record<string, string | undefined> | null;
  deletedAt: string | null;
}

export interface HrJobRole {
  id: number;
  orgId: string;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
}

export interface HrJobLevel {
  id: number;
  orgId: string;
  name: string;
  code: string | null;
  description: string | null;
  rank: number | null;
  isActive: boolean;
}

export interface HrTeam {
  id: number;
  orgId: string;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  deletedAt: string | null;
}

export interface HrHeadcountGroup {
  groupId: number | string | null;
  groupName: string | null;
  headcount: number;
}

export type OrgCatalogInput = {
  name: string;
  code?: string;
  description?: string;
};

export type LocationInput = OrgCatalogInput & {
  type?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    timezone?: string;
  };
};
