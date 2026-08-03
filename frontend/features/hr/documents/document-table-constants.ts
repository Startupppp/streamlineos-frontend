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
    bg: "bg-rose-100 dark:bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-300",
    icon: FileText,
  },
  docx: {
    bg: "bg-blue-100 dark:bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-300",
    icon: FileText,
  },
  doc: {
    bg: "bg-blue-100 dark:bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-300",
    icon: FileText,
  },
  xlsx: {
    bg: "bg-emerald-100 dark:bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-300",
    icon: FileSpreadsheet,
  },
  xls: {
    bg: "bg-emerald-100 dark:bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-300",
    icon: FileSpreadsheet,
  },
  csv: {
    bg: "bg-emerald-100 dark:bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-300",
    icon: FileSpreadsheet,
  },
  png: {
    bg: "bg-amber-100 dark:bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-300",
    icon: FileImage,
  },
  jpg: {
    bg: "bg-amber-100 dark:bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-300",
    icon: FileImage,
  },
  jpeg: {
    bg: "bg-amber-100 dark:bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-300",
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
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  Certificate:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  "ID Proof":
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  Payslip:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  Policy:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  "Offer Letter":
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  Resume: "bg-muted text-foreground border-border",
  General: "bg-muted text-foreground border-border",
};

export const FOLDER_COLORS = [
  "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
  "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
  "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
  "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
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
