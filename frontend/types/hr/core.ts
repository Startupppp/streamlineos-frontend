export interface HrTimelineEntry {
  id: string;
  type: "status_transition" | "effective_change" | "audit";
  action: string;
  entityType: string;
  createdAt: string;
  data: Record<string, unknown>;
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

export type OrgCatalogInput = {
  name: string;
  code?: string;
  description?: string;
};
