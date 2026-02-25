// CRM Mock Data — used by Sales, Customer Executive, and Marketing dashboards

// ─── Formatting Helpers ───────────────────────────────────────────────────────

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString();
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// ─── Sales Dashboard Data ─────────────────────────────────────────────────────

export const salesStats = {
  pipeline: { value: 2_850_000, trend: { value: 12.3, isPositive: true } },
  dealsWon: { value: 47, trend: { value: 8.1, isPositive: true } },
  conversionRate: { value: 79.7, trend: { value: 3.2, isPositive: true } },
  avgDealSize: { value: 60_600, trend: { value: 5.4, isPositive: false } },
};

export const revenueTimeline = [
  { month: "Aug", value: 320000 },
  { month: "Sep", value: 410000 },
  { month: "Oct", value: 380000 },
  { month: "Nov", value: 520000 },
  { month: "Dec", value: 470000 },
  { month: "Jan", value: 560000 },
  { month: "Feb", value: 610000 },
];

export const salesFunnel = [
  { stage: "Leads", value: 1240, color: "#3B82F6" },
  { stage: "Qualified", value: 860, color: "#6366F1" },
  { stage: "Proposal", value: 540, color: "#8B5CF6" },
  { stage: "Negotiation", value: 320, color: "#A855F7" },
  { stage: "Closed Won", value: 185, color: "#10B981" },
];

export const topDeals = [
  { company: "Acme Corp", value: 420000, stage: "Negotiation", rep: "Sarah M.", probability: 85 },
  { company: "TechFlow Inc", value: 310000, stage: "Proposal", rep: "Jason L.", probability: 70 },
  { company: "Global Dynamics", value: 285000, stage: "Closed Won", rep: "Maria K.", probability: 100 },
  { company: "Nexus Systems", value: 195000, stage: "Qualified", rep: "Alex P.", probability: 45 },
  { company: "Blue Horizon", value: 178000, stage: "Negotiation", rep: "Sarah M.", probability: 80 },
];

export const salesLeaderboard = [
  { name: "Sarah Mitchell", deals: 14, revenue: 1_280_000, avatar: "SM" },
  { name: "Jason Lee", deals: 11, revenue: 980_000, avatar: "JL" },
  { name: "Maria Kim", deals: 10, revenue: 870_000, avatar: "MK" },
  { name: "Alex Park", deals: 8, revenue: 620_000, avatar: "AP" },
  { name: "Daniel Chen", deals: 6, revenue: 540_000, avatar: "DC" },
];

export const salesActivity = [
  { type: "deal_won" as const, message: "Closed $285K deal with Global Dynamics", time: "2h ago", person: "Maria K." },
  { type: "meeting" as const, message: "Demo scheduled with Nexus Systems", time: "3h ago", person: "Alex P." },
  { type: "proposal" as const, message: "Sent proposal to TechFlow Inc", time: "5h ago", person: "Jason L." },
  { type: "call" as const, message: "Discovery call with Blue Horizon", time: "6h ago", person: "Sarah M." },
  { type: "email" as const, message: "Follow-up sent to Acme Corp", time: "8h ago", person: "Sarah M." },
  { type: "deal_won" as const, message: "Closed $145K deal with Vertex Labs", time: "1d ago", person: "Daniel C." },
  { type: "meeting" as const, message: "QBR meeting with top accounts", time: "1d ago", person: "Jason L." },
];

export const dealsByStage = [
  { stage: "Discovery", count: 28, value: 840_000, color: "#3B82F6" },
  { stage: "Qualified", count: 22, value: 1_120_000, color: "#6366F1" },
  { stage: "Proposal", count: 15, value: 980_000, color: "#8B5CF6" },
  { stage: "Negotiation", count: 9, value: 720_000, color: "#A855F7" },
  { stage: "Closed Won", count: 47, value: 2_850_000, color: "#10B981" },
];

// ─── Customer Executive Dashboard Data ────────────────────────────────────────

export const customerStats = {
  totalClients: { value: 156, trend: { value: 4.2, isPositive: true } },
  nps: { value: 72, trend: { value: 6.0, isPositive: true } },
  csat: { value: 4.6, trend: { value: 2.1, isPositive: true } },
  retention: { value: 93.6, trend: { value: 1.8, isPositive: true } },
};

export const clientHealth = [
  { label: "Healthy", value: 98, color: "#10B981" },
  { label: "At Risk", value: 34, color: "#F59E0B" },
  { label: "Critical", value: 16, color: "#EF4444" },
  { label: "New", value: 8, color: "#3B82F6" },
];

export const upcomingRenewals = [
  { client: "Acme Corp", value: 240_000, date: "Mar 15, 2026", health: "healthy" as const },
  { client: "TechFlow Inc", value: 180_000, date: "Mar 22, 2026", health: "at_risk" as const },
  { client: "Global Dynamics", value: 320_000, date: "Apr 1, 2026", health: "healthy" as const },
  { client: "Nexus Systems", value: 95_000, date: "Apr 10, 2026", health: "critical" as const },
  { client: "Blue Horizon", value: 150_000, date: "Apr 18, 2026", health: "healthy" as const },
  { client: "Vertex Labs", value: 210_000, date: "May 1, 2026", health: "at_risk" as const },
];

export const keyAccounts = [
  { name: "Acme Corp", revenue: 1_200_000, health: "healthy" as const, csm: "Emma W.", since: "2022" },
  { name: "Global Dynamics", revenue: 980_000, health: "healthy" as const, csm: "Ryan T.", since: "2021" },
  { name: "TechFlow Inc", revenue: 750_000, health: "at_risk" as const, csm: "Emma W.", since: "2023" },
  { name: "DataPrime", revenue: 620_000, health: "healthy" as const, csm: "Lisa H.", since: "2022" },
  { name: "CloudNine", revenue: 540_000, health: "critical" as const, csm: "Ryan T.", since: "2024" },
];

export const customerInteractions = [
  { type: "call" as const, message: "QBR call with Acme Corp — discussed expansion", time: "1h ago", person: "Emma W." },
  { type: "ticket" as const, message: "Resolved P1 ticket for TechFlow Inc", time: "3h ago", person: "Support" },
  { type: "meeting" as const, message: "Onboarding session with new client DataPrime", time: "5h ago", person: "Lisa H." },
  { type: "email" as const, message: "Renewal proposal sent to Global Dynamics", time: "6h ago", person: "Ryan T." },
  { type: "escalation" as const, message: "Escalation from CloudNine — API latency issues", time: "8h ago", person: "Ryan T." },
  { type: "call" as const, message: "Check-in call with Blue Horizon", time: "1d ago", person: "Emma W." },
];

export const supportStats = {
  openTickets: 23,
  avgResolution: "4.2h",
  firstResponse: "18min",
  satisfaction: 94.2,
};

export const retentionTimeline = [
  { month: "Aug", value: 91.2 },
  { month: "Sep", value: 92.0 },
  { month: "Oct", value: 91.8 },
  { month: "Nov", value: 93.1 },
  { month: "Dec", value: 92.5 },
  { month: "Jan", value: 93.4 },
  { month: "Feb", value: 93.6 },
];

export const csatTimeline = [
  { month: "Aug", value: 4.2 },
  { month: "Sep", value: 4.3 },
  { month: "Oct", value: 4.3 },
  { month: "Nov", value: 4.5 },
  { month: "Dec", value: 4.4 },
  { month: "Jan", value: 4.5 },
  { month: "Feb", value: 4.6 },
];

// ─── Marketing Dashboard Data ─────────────────────────────────────────────────

export const marketingStats = {
  campaigns: { value: 8, trend: { value: 14.3, isPositive: true } },
  leads: { value: 2_847, trend: { value: 22.1, isPositive: true } },
  mqls: { value: 892, trend: { value: 18.6, isPositive: true } },
  roi: { value: 340, trend: { value: 15.0, isPositive: true } },
};

export const mqlTimeline = [
  { month: "Aug", value: 520 },
  { month: "Sep", value: 610 },
  { month: "Oct", value: 580 },
  { month: "Nov", value: 720 },
  { month: "Dec", value: 690 },
  { month: "Jan", value: 780 },
  { month: "Feb", value: 892 },
];

export const leadFunnel = [
  { stage: "Visitors", value: 48500, color: "#3B82F6" },
  { stage: "Leads", value: 2847, color: "#6366F1" },
  { stage: "MQLs", value: 892, color: "#8B5CF6" },
  { stage: "SQLs", value: 412, color: "#A855F7" },
  { stage: "Opportunities", value: 185, color: "#10B981" },
];

export const campaigns = [
  { name: "Spring Product Launch", status: "active" as const, leads: 620, spend: 45000, roi: 4.2 },
  { name: "LinkedIn ABM Campaign", status: "active" as const, leads: 340, spend: 28000, roi: 3.8 },
  { name: "Webinar Series Q1", status: "active" as const, leads: 290, spend: 12000, roi: 5.1 },
  { name: "Google Ads — Brand", status: "active" as const, leads: 480, spend: 35000, roi: 3.2 },
  { name: "Content Syndication", status: "paused" as const, leads: 210, spend: 18000, roi: 2.8 },
  { name: "Email Nurture Flow", status: "active" as const, leads: 520, spend: 8000, roi: 7.4 },
  { name: "Trade Show — CRMExpo", status: "completed" as const, leads: 180, spend: 55000, roi: 1.9 },
  { name: "Referral Program", status: "active" as const, leads: 207, spend: 5000, roi: 9.2 },
];

export const channelBreakdown = [
  { label: "Organic Search", value: 35, color: "#10B981" },
  { label: "Paid Ads", value: 28, color: "#3B82F6" },
  { label: "Social Media", value: 18, color: "#8B5CF6" },
  { label: "Email", value: 12, color: "#F59E0B" },
  { label: "Referral", value: 7, color: "#EF4444" },
];

export const contentPerformance = [
  { title: "2026 CRM Trends Report", type: "Whitepaper", views: 4200, leads: 180, convRate: 4.3 },
  { title: "ROI Calculator Tool", type: "Interactive", views: 3800, leads: 320, convRate: 8.4 },
  { title: "Customer Success Playbook", type: "eBook", views: 2900, leads: 145, convRate: 5.0 },
  { title: "Product Demo Video", type: "Video", views: 6100, leads: 210, convRate: 3.4 },
  { title: "Integration Guide Series", type: "Blog", views: 8400, leads: 95, convRate: 1.1 },
];

export const upcomingEvents = [
  { name: "CRM Summit 2026", date: "Mar 12-14", type: "Conference", status: "confirmed" as const },
  { name: "Product Webinar: AI Features", date: "Mar 20", type: "Webinar", status: "confirmed" as const },
  { name: "Partner Meetup — NYC", date: "Apr 3", type: "Meetup", status: "planning" as const },
  { name: "Customer Advisory Board", date: "Apr 15", type: "Meeting", status: "confirmed" as const },
  { name: "Digital Marketing Workshop", date: "May 1", type: "Workshop", status: "planning" as const },
];

// ─── Support Dashboard Data ─────────────────────────────────────────────────

export const supportDashboardStats = {
  openTickets: { value: 142, trend: { value: 5.2, isPositive: false } },
  avgResolution: { value: "4h 12m", trend: { value: 12.5, isPositive: true } },
  csatScore: { value: "4.8/5", trend: { value: 0.8, isPositive: true } },
  responseRate: { value: "98.2%", trend: { value: 2.1, isPositive: true } },
};

export const ticketStatusBreakdown = [
  { label: "New", value: 438, color: "#3B82F6" },
  { label: "In Progress", value: 312, color: "#F59E0B" },
  { label: "Resolved", value: 250, color: "#10B981" },
  { label: "Closed", value: 250, color: "#6366F1" },
];

export const ticketVolumeTimeline = [
  { month: "Aug", value: 68 },
  { month: "Sep", value: 75 },
  { month: "Oct", value: 84 },
  { month: "Nov", value: 72 },
  { month: "Dec", value: 65 },
  { month: "Jan", value: 78 },
  { month: "Feb", value: 82 },
];

export const supportActivityFeed = [
  { type: "ticket" as const, message: "Ticket #2094 created — High Priority", time: "24m ago", person: "System" },
  { type: "email" as const, message: "Agent replied to Ticket #2091", time: "1h ago", person: "Jane D." },
  { type: "deal_won" as const, message: "Ticket #2088 resolved via automation", time: "2h ago", person: "System" },
  { type: "call" as const, message: "Customer callback for Ticket #2085", time: "3h ago", person: "John S." },
  { type: "escalation" as const, message: "Ticket #2080 escalated to Level 2", time: "5h ago", person: "Robert F." },
  { type: "email" as const, message: "SLA breach warning for Ticket #2076", time: "6h ago", person: "System" },
  { type: "ticket" as const, message: "Ticket #2074 reopened by customer", time: "8h ago", person: "Emily C." },
];

export const supportTeamMembers = [
  { name: "Jane Doe", role: "Admin", access: "Full", avatar: "JD", status: "online" as const },
  { name: "John Smith", role: "Manager", access: "Edit", avatar: "JS", status: "online" as const },
  { name: "Robert Fox", role: "Agent", access: "View", avatar: "RF", status: "away" as const },
  { name: "Emily Chen", role: "Agent", access: "View", avatar: "EC", status: "online" as const },
  { name: "Michael Brown", role: "Lead", access: "Edit", avatar: "MB", status: "offline" as const },
];

export const ticketsByPriority = [
  { label: "Critical", value: 18, color: "#EF4444" },
  { label: "High", value: 42, color: "#F59E0B" },
  { label: "Medium", value: 56, color: "#3B82F6" },
  { label: "Low", value: 26, color: "#10B981" },
];
