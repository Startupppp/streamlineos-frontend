

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
  canUpdate: boolean;
  canAssign: boolean;
  canDelete: boolean;
  canCreateDeal: boolean;
  canCreate: boolean;
  activeFilterLabels: string[];
  onClearFilters: () => void;
  onCreateLead: () => void;
}

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

export const ALL_COLUMNS = [
  { key: "leadId",             label: "Lead ID",           defaultVisible: true,  sortable: false },
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

export function formatLeadId(id: number): string {
  return `LD-${String(id).padStart(5, "0")}`;
}

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
