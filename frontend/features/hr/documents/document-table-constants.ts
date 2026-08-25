import {
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
} from "lucide-react";

export const DOCUMENT_TYPES = [
  { value: "CONTRACT", label: "Contract" },
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "ID_PROOF", label: "ID Proof" },
  { value: "PAYSLIP", label: "Payslip" },
  { value: "POLICY", label: "Policy" },
  { value: "OFFER_LETTER", label: "Offer Letter" },
  { value: "RESUME", label: "Resume" },
  { value: "OTHER", label: "Other" },
] as const;

export const FILE_ICON_CONFIG: Record<
  string,
  {
    bg: string;
    text: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  pdf: {
    bg: "bg-status-danger-surface",
    text: "text-status-danger-ink",
    icon: FileText,
  },
  docx: {
    bg: "bg-status-info-surface",
    text: "text-status-info-ink",
    icon: FileText,
  },
  doc: {
    bg: "bg-status-info-surface",
    text: "text-status-info-ink",
    icon: FileText,
  },
  xlsx: {
    bg: "bg-status-success-surface",
    text: "text-status-success-ink",
    icon: FileSpreadsheet,
  },
  xls: {
    bg: "bg-status-success-surface",
    text: "text-status-success-ink",
    icon: FileSpreadsheet,
  },
  csv: {
    bg: "bg-status-success-surface",
    text: "text-status-success-ink",
    icon: FileSpreadsheet,
  },
  png: {
    bg: "bg-status-warning-surface",
    text: "text-status-warning-ink",
    icon: FileImage,
  },
  jpg: {
    bg: "bg-status-warning-surface",
    text: "text-status-warning-ink",
    icon: FileImage,
  },
  jpeg: {
    bg: "bg-status-warning-surface",
    text: "text-status-warning-ink",
    icon: FileImage,
  },
};

export const DEFAULT_FILE_ICON = {
  bg: "bg-muted",
  text: "text-muted-foreground",
  icon: File,
};

export const TYPE_BADGE_COLORS: Record<string, string> = {
  Contract:
    "bg-status-info-surface text-status-info-ink border-status-info-rule",
  Certificate:
    "bg-status-info-surface text-status-info-ink border-status-info-rule",
  "ID Proof":
    "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  Payslip:
    "bg-status-success-surface text-status-success-ink border-status-success-rule",
  Policy:
    "bg-status-info-surface text-status-info-ink border-status-info-rule",
  "Offer Letter":
    "bg-status-info-surface text-status-info-ink border-status-info-rule",
  Resume: "bg-muted text-foreground border-border",
  General: "bg-muted text-foreground border-border",
};

export const FOLDER_COLORS = [
  "bg-status-info-surface text-status-info-ink",
  "bg-status-success-surface text-status-success-ink",
  "bg-status-warning-surface text-status-warning-ink",
  "bg-status-info-surface text-status-info-ink",
];

export function getFileIconConfig(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return FILE_ICON_CONFIG[ext] ?? DEFAULT_FILE_ICON;
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
