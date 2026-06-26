import {
  Users,
  LayoutGrid,
  TrendingUp,
  Calendar,
  MessageSquare,
  BarChart3,
  Shield,
  Sparkles,
  Briefcase,
  Headphones,
  Wallet,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export type Module = {
  icon: LucideIcon;
  title: string;
  description: string;
  tags: string[];
  accent: string;
};

export const bentoFeatures: Module[] = [
  {
    icon: Users,
    title: "Human Resources",
    description:
      "Employee 360°, onboarding wizards, attendance, leaves, payroll, and offer-letter automation — the full lifecycle, in one place.",
    tags: ["Onboarding", "Payroll", "Attendance", "Leaves"],
    accent: "from-blue-500/15 to-cyan-500/5",
  },
  {
    icon: LayoutGrid,
    title: "Projects & Sprints",
    description:
      "Kanban, sprint planning, backlogs, epics, time tracking, and velocity analytics — engineered for delivery.",
    tags: ["Kanban", "Sprints", "Timesheets", "Velocity"],
    accent: "from-indigo-500/15 to-blue-500/5",
  },
  {
    icon: TrendingUp,
    title: "CRM & Sales",
    description:
      "Lead pipelines, deal stages, quotes, targets, and AI-powered scoring. Track from cold contact to closed-won.",
    tags: ["Leads", "Deals", "Quotes", "Forecasts"],
    accent: "from-cyan-500/15 to-teal-500/5",
  },
];

export const modules: Module[] = [
  {
    icon: Calendar,
    title: "Unified Calendar",
    description:
      "Interviews, meetings, sprint ceremonies, and events in one calendar with Google Calendar two-way sync.",
    tags: ["Events", "Interviews", "Google Sync"],
    accent: "from-blue-500/15 to-cyan-500/5",
  },
  {
    icon: MessageSquare,
    title: "Real-time Chat",
    description:
      "DMs, group channels, file attachments, mentions, and threads — powered by Ably for true sub-100ms delivery.",
    tags: ["DMs", "Channels", "Files"],
    accent: "from-cyan-500/15 to-blue-500/5",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description:
      "Role-based dashboards, drillable reports, scheduled emails, and exportable Excel/PDF outputs.",
    tags: ["Dashboards", "Reports", "Exports"],
    accent: "from-indigo-500/15 to-blue-500/5",
  },
  {
    icon: Sparkles,
    title: "AI Assistance",
    description:
      "Smart summaries, lead scoring, attrition risk, email drafts, and review generation built on Google + OpenAI.",
    tags: ["Summaries", "Scoring", "Drafts"],
    accent: "from-blue-500/15 to-violet-500/5",
  },
  {
    icon: Shield,
    title: "RBAC & Compliance",
    description:
      "Role-based access, audit logs, MFA, IP allow-listing, encryption at rest, and SOC-ready posture.",
    tags: ["Roles", "Audit", "MFA"],
    accent: "from-cyan-500/15 to-blue-500/5",
  },
  {
    icon: Briefcase,
    title: "Recruitment",
    description:
      "ATS, candidate vault, scorecards, interview scheduling, offer rollout, and careers portal — full ATS stack.",
    tags: ["ATS", "Scorecards", "Offers"],
    accent: "from-blue-500/15 to-teal-500/5",
  },
  {
    icon: Wallet,
    title: "Expenses & Payroll",
    description:
      "Expense submission, approval flows, payroll runs, payslips, and bulk import with validation.",
    tags: ["Expenses", "Payroll", "Payslips"],
    accent: "from-indigo-500/15 to-cyan-500/5",
  },
  {
    icon: Headphones,
    title: "Support & Knowledge",
    description:
      "Helpdesk tickets, canned responses, routing rules, and a searchable knowledge base — support in the same workspace.",
    tags: ["Helpdesk", "KB", "Macros"],
    accent: "from-blue-500/15 to-cyan-500/5",
  },
  {
    icon: ClipboardList,
    title: "Org Settings",
    description:
      "Multi-org tenancy, branches, departments, policies, holidays, SLAs, and webhook integrations.",
    tags: ["Multi-org", "Policies", "Webhooks"],
    accent: "from-cyan-500/15 to-blue-500/5",
  },
];

export const stats = [
  { value: 22, suffix: "+", label: "Integrated apps" },
  { value: 99.99, suffix: "%", label: "Uptime SLA", decimals: 2 },
  { value: 100, suffix: "ms", label: "Realtime delivery", prefix: "<" },
  { value: 14, suffix: " min", label: "To get started" },
];
