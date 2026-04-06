/* ─── Shared types and constants for the lead table ─── */

export interface Lead {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  company?: string | null;
  designation?: string | null;
  source?: string | null;
  status: string;
  priority?: string | null;
  potentialValue?: string | null;
  investmentInterest?: string | null;
  score?: number | null;
  city?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  slaDeadline?: string | Date | null;
  followUpDate?: string | Date | null;
  createdAt?: string | Date | null;
  assignedTo?: { id?: string; name?: string | null; image?: string | null } | null;
}

export interface TeamMember {
  id: string;
  name: string | null;
  image?: string | null;
}

export interface LeadTableViewProps {
  leads: Lead[];
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  sortColumn: string;
  sortDirection: "asc" | "desc";
  onSort: (column: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onStatusChange: (
    leadId: number,
    newStatus: string,
    extra?: {
      conversionNotes?: string;
      investmentInterest?: string;
      estimatedAmount?: string;
      lostReason?: string;
      lostNotes?: string;
    },
  ) => void;
  onPriorityChange: (leadId: number, newPriority: string) => void;
  onAssign: (leadId: number, userId: string) => void;
  onBulkUpdate: (
    leadIds: number[],
    update: { status?: string; priority?: string; assignedToId?: string },
  ) => void;
  onBulkDelete: (leadIds: number[]) => void;
  teamMembers: TeamMember[];
  isLoading: boolean;
  isAdmin: boolean;
}

export const STATUSES = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"] as const;
export const PRIORITIES = ["HOT", "WARM", "COLD"] as const;
export const PAGE_SIZES = [25, 50, 100] as const;

export const LOST_REASONS = [
  "Not interested",
  "Budget constraints",
  "Chose competitor",
  "No response",
  "Bad timing",
  "Invalid lead",
  "Duplicate",
  "Other",
] as const;

export const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  CONTACTED: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  INTERESTED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  QUALIFIED: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  CONVERTED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  LOST: "bg-red-500/10 text-red-400 border-red-500/20",
};

export const PRIORITY_COLORS: Record<string, string> = {
  HOT: "bg-red-500/15 text-red-400 border-red-500/20",
  WARM: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  COLD: "bg-blue-400/15 text-blue-400 border-blue-400/20",
};

export const SOURCE_COLORS: Record<string, string> = {
  referral: "bg-green-500/10 text-green-400",
  campaign: "bg-indigo-500/10 text-indigo-400",
  cold_call: "bg-orange-500/10 text-orange-400",
  website: "bg-blue-500/10 text-blue-400",
  social_media: "bg-purple-500/10 text-purple-400",
  walk_in: "bg-teal-500/10 text-teal-400",
  other: "bg-gray-500/10 text-gray-400",
};

/**
 * Column config matching reference "CRM Leads Zoom Sheet"
 * Default visible columns match the dense spreadsheet layout
 */
export const ALL_COLUMNS = [
  { key: "createdAt",          label: "Date",              defaultVisible: true,  sortable: true  },
  { key: "name",               label: "Name",              defaultVisible: true,  sortable: true  },
  { key: "phone",              label: "Mobile",            defaultVisible: true,  sortable: false },
  { key: "city",               label: "City",              defaultVisible: true,  sortable: false },
  { key: "source",             label: "Source",            defaultVisible: true,  sortable: true  },
  { key: "priority",           label: "Priority",          defaultVisible: true,  sortable: true  },
  { key: "status",             label: "Status",            defaultVisible: true,  sortable: true  },
  { key: "company",            label: "Company",           defaultVisible: true,  sortable: true  },
  { key: "notes",              label: "Notes",             defaultVisible: true,  sortable: false },
  { key: "followUpDate",       label: "Follow-up",         defaultVisible: true,  sortable: true  },
  { key: "investmentInterest", label: "Interest (₹)",      defaultVisible: true,  sortable: true  },
  { key: "potentialValue",     label: "Value (₹)",         defaultVisible: true,  sortable: true  },
  { key: "assignedTo",         label: "Assigned",          defaultVisible: true,  sortable: false },
  { key: "email",              label: "Email",             defaultVisible: false, sortable: true  },
  { key: "whatsapp",           label: "WhatsApp",          defaultVisible: false, sortable: false },
  { key: "score",              label: "Score",             defaultVisible: false, sortable: true  },
  { key: "tags",               label: "Tags",              defaultVisible: false, sortable: false },
  { key: "sla",                label: "SLA",               defaultVisible: false, sortable: false },
] as const;

export const DEFAULT_VISIBLE = new Set(
  ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key),
);

/* ─── Pure helpers ─── */
export function formatINR(val: string | number | null | undefined): string {
  if (!val) return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num) || num === 0) return "—";
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(0)}K`;
  return `₹${num.toLocaleString("en-IN")}`;
}

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function getStoredColumns(): Set<string> {
  if (typeof window === "undefined") return DEFAULT_VISIBLE;
  const saved = localStorage.getItem("lead-table-columns");
  return saved ? new Set(JSON.parse(saved)) : DEFAULT_VISIBLE;
}
