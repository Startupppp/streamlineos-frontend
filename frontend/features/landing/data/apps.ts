import {
  Users,
  Briefcase,
  LayoutGrid,
  TrendingUp,
  MessageSquare,
  Calendar,
  BarChart3,
  Sparkles,
  Wallet,
  Headphones,
  BookOpen,
  Receipt,
  FileText,
  Target,
  Clock,
  HeartHandshake,
  Shield,
  GitBranch,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export type AppCategory = "people" | "revenue" | "delivery" | "platform";

export type LandingApp = {
  id: string;
  name: string;
  icon: LucideIcon;
  category: AppCategory;
};

export const APP_CATEGORIES: Record<AppCategory, string> = {
  people: "People & HR",
  revenue: "Revenue & CRM",
  delivery: "Delivery & Ops",
  platform: "Platform",
};

export const LANDING_APPS: LandingApp[] = [
  { id: "hr", name: "Human Resources", icon: Users, category: "people" },
  { id: "recruitment", name: "Recruitment", icon: Briefcase, category: "people" },
  { id: "attendance", name: "Attendance", icon: Clock, category: "people" },
  { id: "payroll", name: "Payroll", icon: Wallet, category: "people" },
  { id: "performance", name: "Performance", icon: Target, category: "people" },
  { id: "crm", name: "CRM", icon: TrendingUp, category: "revenue" },
  { id: "sales", name: "Sales", icon: BarChart3, category: "revenue" },
  { id: "quotes", name: "Quotes", icon: FileText, category: "revenue" },
  { id: "billing", name: "Billing", icon: Receipt, category: "revenue" },
  { id: "customer-success", name: "Customer Success", icon: HeartHandshake, category: "revenue" },
  { id: "build", name: "Build", icon: LayoutGrid, category: "delivery" },
  { id: "timesheets", name: "Timesheets", icon: ClipboardList, category: "delivery" },
  { id: "accounting", name: "Accounting", icon: Wallet, category: "delivery" },
  { id: "support", name: "Helpdesk", icon: Headphones, category: "delivery" },
  { id: "knowledge", name: "Knowledge", icon: BookOpen, category: "delivery" },
  { id: "chat", name: "Discuss", icon: MessageSquare, category: "platform" },
  { id: "calendar", name: "Calendar", icon: Calendar, category: "platform" },
  { id: "analytics", name: "Analytics", icon: BarChart3, category: "platform" },
  { id: "ai", name: "AI", icon: Sparkles, category: "platform" },
  { id: "automation", name: "Automation", icon: GitBranch, category: "platform" },
  { id: "security", name: "Security", icon: Shield, category: "platform" },
];

export const HERO_APP_CHIPS = LANDING_APPS.slice(0, 14);
