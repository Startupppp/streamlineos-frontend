import type { RouterInputs, RouterOutputs } from "../trpc";

export type MutationOnSuccess<TData, TVariables, TContext> = (
  data: TData,
  variables: TVariables,
  context: TContext
) => void;

const baseKey = ["vaivamm"] as const;
const hrBaseKey = [...baseKey, "hr"] as const;
const projectBaseKey = [...baseKey, "project"] as const;
const dashboardBaseKey = [...baseKey, "dashboard"] as const;
const rbacBaseKey = [...baseKey, "rbac"] as const;
const reportsBaseKey = [...baseKey, "reports"] as const;
const crmBaseKey = [...baseKey, "crm"] as const;
const leadsBaseKey = [...baseKey, "leads"] as const;
const targetsBaseKey = [...baseKey, "targets"] as const;
const rolesBaseKey = [...baseKey, "roles"] as const;
const chatBaseKey = [...baseKey, "chat"] as const;

export const vaivammKeys = {
  all: baseKey,

  hr: {
    all: hrBaseKey,
    departments: () => [...hrBaseKey, "departments"] as const,
    attendanceStatus: () => [...hrBaseKey, "attendanceStatus"] as const,
    leaves: () => [...hrBaseKey, "leaves"] as const,
    payrolls: () => [...hrBaseKey, "payrolls"] as const,
    salaryStructures: (userId?: string) =>
      [...hrBaseKey, "salaryStructures", { userId }] as const,
    expenses: (userId?: string, status?: string) =>
      [...hrBaseKey, "expenses", { userId, status }] as const,
    assets: () => [...hrBaseKey, "assets"] as const,
    documents: (userId?: string, type?: string) =>
      [...hrBaseKey, "documents", { userId, type }] as const,
    performanceReviews: (userId?: string) =>
      [...hrBaseKey, "performanceReviews", { userId }] as const,
    goals: (userId?: string) => [...hrBaseKey, "goals", { userId }] as const,
    helpdeskTickets: (userId?: string, status?: string) =>
      [...hrBaseKey, "helpdeskTickets", { userId, status }] as const,
    workLogs: (year: number, quarter: number, userId?: string) =>
      [...hrBaseKey, "workLogs", { year, quarter, userId }] as const,
  },

  project: {
    all: projectBaseKey,
    projects: () => [...projectBaseKey, "projects"] as const,
    project: (id: number) => [...projectBaseKey, "project", { id }] as const,
    sprints: (projectId?: number) =>
      [...projectBaseKey, "sprints", { projectId }] as const,
    ticket: (id: number) => [...projectBaseKey, "ticket", { id }] as const,
    labels: () => [...projectBaseKey, "labels"] as const,
    members: () => [...projectBaseKey, "members"] as const,
    timeEntries: (ticketId?: number, userId?: string) =>
      [...projectBaseKey, "timeEntries", { ticketId, userId }] as const,
    sprintBurndown: (sprintId: number) =>
      [...projectBaseKey, "sprintBurndown", { sprintId }] as const,
  },

  dashboard: {
    all: dashboardBaseKey,
    stats: () => [...dashboardBaseKey, "stats"] as const,
    recentProjects: () => [...dashboardBaseKey, "recentProjects"] as const,
    teamAvailability: () => [...dashboardBaseKey, "teamAvailability"] as const,
    myIssues: (userId: string) => [...dashboardBaseKey, "myIssues", { userId }] as const,
    activeSprintSummary: () => [...dashboardBaseKey, "activeSprintSummary"] as const,
    recentActivity: () => [...dashboardBaseKey, "recentActivity"] as const,
  },

  rbac: {
    all: rbacBaseKey,
    userPermissions: () => [...rbacBaseKey, "userPermissions"] as const,
    allPermissions: () => [...rbacBaseKey, "allPermissions"] as const,
    rolePermissions: (role: string) =>
      [...rbacBaseKey, "rolePermissions", { role }] as const,
  },

  reports: {
    all: reportsBaseKey,
    attendance: (userId?: string, startDate?: Date, endDate?: Date) =>
      [...reportsBaseKey, "attendance", { userId, startDate, endDate }] as const,
    payroll: (userId?: string, startMonth?: string, endMonth?: string) =>
      [...reportsBaseKey, "payroll", { userId, startMonth, endMonth }] as const,
    project: (projectId?: number, startDate?: Date, endDate?: Date) =>
      [...reportsBaseKey, "project", { projectId, startDate, endDate }] as const,
    teamPerformance: (startDate?: Date, endDate?: Date) =>
      [...reportsBaseKey, "teamPerformance", { startDate, endDate }] as const,
    dashboardStats: () => [...reportsBaseKey, "dashboardStats"] as const,
  },

  crm: {
    all: crmBaseKey,
    salesDashboard: () => [...crmBaseKey, "salesDashboard"] as const,
    customerExecutiveDashboard: () => [...crmBaseKey, "customerExecutiveDashboard"] as const,
    marketingDashboard: () => [...crmBaseKey, "marketingDashboard"] as const,
    supportDashboard: () => [...crmBaseKey, "supportDashboard"] as const,
    person: (slug: string) => [...crmBaseKey, "person", slug] as const,
    allPeopleSlugs: () => [...crmBaseKey, "allPeopleSlugs"] as const,
  },

  leads: {
    all: leadsBaseKey,
    list: (status?: string, assignedTo?: string) => [...leadsBaseKey, "list", { status, assignedTo }] as const,
    board: () => [...leadsBaseKey, "board"] as const,
    detail: (id: number) => [...leadsBaseKey, "detail", { id }] as const,
    stats: () => [...leadsBaseKey, "stats"] as const,
    activities: (leadId: number) => [...leadsBaseKey, "activities", { leadId }] as const,
  },

  targets: {
    all: targetsBaseKey,
    list: (userId?: string) => [...targetsBaseKey, "list", { userId }] as const,
    myTargets: () => [...targetsBaseKey, "myTargets"] as const,
    leaderboard: (metricType?: string) => [...targetsBaseKey, "leaderboard", { metricType }] as const,
  },

  roles: {
    all: rolesBaseKey,
    list: () => [...rolesBaseKey, "list"] as const,
    detail: (id: number) => [...rolesBaseKey, "detail", { id }] as const,
  },

  chat: {
    all: chatBaseKey,
    myChannels: () => [...chatBaseKey, "myChannels"] as const,
    channel: (id: number) => [...chatBaseKey, "channel", { id }] as const,
    messages: (channelId: number) => [...chatBaseKey, "messages", { channelId }] as const,
    poll: (channelId: number, since: string) => [...chatBaseKey, "poll", { channelId, since }] as const,
    unreadTotal: () => [...chatBaseKey, "unreadTotal"] as const,
    onlineUsers: () => [...chatBaseKey, "onlineUsers"] as const,
    orgUsers: () => [...chatBaseKey, "orgUsers"] as const,
    search: (query: string) => [...chatBaseKey, "search", { query }] as const,
  },
};

export type HrRouterOutputs = RouterOutputs["hr"];
export type ProjectRouterOutputs = RouterOutputs["project"];
export type DashboardRouterOutputs = RouterOutputs["dashboard"];
export type RbacRouterOutputs = RouterOutputs["rbac"];
export type ReportsRouterOutputs = RouterOutputs["reports"];
export type CrmRouterOutputs = RouterOutputs["crm"];

export type HrRouterInputs = RouterInputs["hr"];
export type ProjectRouterInputs = RouterInputs["project"];
export type DashboardRouterInputs = RouterInputs["dashboard"];
export type RbacRouterInputs = RouterInputs["rbac"];
export type ReportsRouterInputs = RouterInputs["reports"];
export type CrmRouterInputs = RouterInputs["crm"];
export type LeadsRouterOutputs = RouterOutputs["leads"];
export type LeadsRouterInputs = RouterInputs["leads"];
export type TargetsRouterOutputs = RouterOutputs["targets"];
export type TargetsRouterInputs = RouterInputs["targets"];
export type RolesRouterOutputs = RouterOutputs["roles"];
export type RolesRouterInputs = RouterInputs["roles"];
export type ChatRouterOutputs = RouterOutputs["chat"];
export type ChatRouterInputs = RouterInputs["chat"];
