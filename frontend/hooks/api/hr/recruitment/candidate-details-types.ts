
export interface VaultDocument {
  id: number;
  candidateId: number;
  orgId: string;
  filename: string;
  s3Key: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  documentType: string | null;
  avResult: "PENDING" | "CLEAN" | "INFECTED" | null;
  expiresAt: string | null;
  uploadedBy: string;
  createdAt: string | null;
}

export type BgvStatus = "NOT_INITIATED" | "INITIATED" | "PENDING" | "CLEARED" | "FAILED";
export type VaultDocumentType = "AADHAR" | "PAN" | "PASSPORT" | "CERTIFICATE" | "OFFER_LETTER" | "OTHER";

export interface RolloutDocumentRecord {
  id: number;
  templateId: number | null;
  templateTitle: string | null;
  title: string;
  status: string;
  sentAt: string | null;
  viewedAt: string | null;
  signedAt: string | null;
  declinedAt: string | null;
  createdAt: string | null;
  createdBy: string;
}

export interface RolloutDocumentsInput {
  templateIds: number[];
  variables: Record<string, string>;
  sendEmail: boolean;
}

export interface CandidateDocumentRecord {
  id: number;
  candidateId: number;
  orgId: string;
  templateId: number | null;
  title: string;
  htmlContent: string;
  status: string;
  externalDocId: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  signedAt: string | null;
  declinedAt: string | null;
  acceptanceDeadline: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RolloutDocumentsResult {
  documents: CandidateDocumentRecord[];
  count: number;
}

export interface UpdateBgvInput {
  bgvStatus: BgvStatus;
  bgvAgency?: string;
  bgvNotes?: string;
}

export interface VaultAccessLog {
  id: number;
  action: string;
  accessedAt: string | null;
  fileName: string;
  documentType: string | null;
  accessorDisplayName: string;
}

export interface BgvComplianceRow {
  jobPostingId: number;
  jobTitle: string;
  total: number;
  cleared: number;
  failed: number;
  pending: number;
  initiated: number;
  notInitiated: number;
  clearedPct: number;
}

export interface CandidateReferral {
  id: number;
  orgId: string;
  candidateId: number;
  referredBy: string;
  relationship: string | null;
  notes: string | null;
  bonusEligible: boolean;
  bonusAmount: string | null;
  bonusPaidAt: string | null;
  createdAt: string;
}

export interface CalibrationSession {
  id: number;
  orgId: string;
  candidateId: number;
  jobPostingId: number | null;
  scheduledAt: string | null;
  status: "pending" | "scheduled" | "completed" | "cancelled";
  notes: string | null;
  decision: "STRONG_HIRE" | "HIRE" | "NO_HIRE" | "HOLD" | null;
  participantIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceCheck {
  id: number;
  candidateId: number;
  orgId: string;
  referenceName: string;
  referenceDesignation: string | null;
  referenceCompany: string | null;
  referenceEmail: string | null;
  referencePhone: string | null;
  relationship: string | null;
  status: string;
  outcome: string | null;
  notes: string | null;
  contactedAt: string | null;
  createdBy: string | null;
  createdAt: string | null;
}

export interface CreateReferenceCheckInput {
  referenceName: string;
  referenceDesignation?: string;
  referenceCompany?: string;
  referenceEmail?: string;
  referencePhone?: string;
  relationship?: string;
  notes?: string;
}

export interface CandidateActivityEvent {
  type: "AUDIT" | "INTERVIEW" | "MESSAGE" | "DOCUMENT";
  id: string;
  label: string;
  detail: Record<string, unknown> | null;
  actor: string | null;
  at: string;
}
