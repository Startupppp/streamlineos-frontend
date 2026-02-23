import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import { vaivammTrpcClient, RouterInputs, RouterOutputs } from "../trpc";

type MutationOnSuccess<TData, TVariables, TContext> = (
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
};

type HrRouterOutputs = RouterOutputs["hr"];
type ProjectRouterOutputs = RouterOutputs["project"];
type DashboardRouterOutputs = RouterOutputs["dashboard"];
type RbacRouterOutputs = RouterOutputs["rbac"];
type ReportsRouterOutputs = RouterOutputs["reports"];

type HrRouterInputs = RouterInputs["hr"];
type ProjectRouterInputs = RouterInputs["project"];
type DashboardRouterInputs = RouterInputs["dashboard"];
type RbacRouterInputs = RouterInputs["rbac"];
type ReportsRouterInputs = RouterInputs["reports"];

export const useHrDepartments = (
  options?: Omit<
    UseQueryOptions<HrRouterOutputs["getDepartments"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<HrRouterOutputs["getDepartments"], Error>({
    queryKey: vaivammKeys.hr.departments(),
    queryFn: () => vaivammTrpcClient.hr.getDepartments.query(),
    ...options,
  });
};

export const useHrAttendanceStatus = (
  options?: Omit<
    UseQueryOptions<HrRouterOutputs["getAttendanceStatus"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<HrRouterOutputs["getAttendanceStatus"], Error>({
    queryKey: vaivammKeys.hr.attendanceStatus(),
    queryFn: () => vaivammTrpcClient.hr.getAttendanceStatus.query(),
    ...options,
  });
};

export const useHrLeaves = (
  options?: Omit<
    UseQueryOptions<HrRouterOutputs["getLeaves"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<HrRouterOutputs["getLeaves"], Error>({
    queryKey: vaivammKeys.hr.leaves(),
    queryFn: () => vaivammTrpcClient.hr.getLeaves.query(),
    ...options,
  });
};

export const useHrPayrolls = (
  options?: Omit<
    UseQueryOptions<HrRouterOutputs["getPayrolls"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<HrRouterOutputs["getPayrolls"], Error>({
    queryKey: vaivammKeys.hr.payrolls(),
    queryFn: () => vaivammTrpcClient.hr.getPayrolls.query(),
    ...options,
  });
};

export const useHrSalaryStructures = (
  userId?: string,
  options?: Omit<
    UseQueryOptions<HrRouterOutputs["getSalaryStructures"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<HrRouterOutputs["getSalaryStructures"], Error>({
    queryKey: vaivammKeys.hr.salaryStructures(userId),
    queryFn: () => vaivammTrpcClient.hr.getSalaryStructures.query({ userId }),
    enabled: true,
    ...options,
  });
};

export const useHrExpenses = (
  userId?: string,
  status?: string,
  options?: Omit<
    UseQueryOptions<HrRouterOutputs["getExpenses"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<HrRouterOutputs["getExpenses"], Error>({
    queryKey: vaivammKeys.hr.expenses(userId, status),
    queryFn: () => vaivammTrpcClient.hr.getExpenses.query({ userId, status }),
    ...options,
  });
};

export const useHrAssets = (
  options?: Omit<
    UseQueryOptions<HrRouterOutputs["getAssets"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<HrRouterOutputs["getAssets"], Error>({
    queryKey: vaivammKeys.hr.assets(),
    queryFn: () => vaivammTrpcClient.hr.getAssets.query(),
    ...options,
  });
};

export const useHrDocuments = (
  userId?: string,
  type?: string,
  options?: Omit<
    UseQueryOptions<HrRouterOutputs["getDocuments"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<HrRouterOutputs["getDocuments"], Error>({
    queryKey: vaivammKeys.hr.documents(userId, type),
    queryFn: () => vaivammTrpcClient.hr.getDocuments.query({ userId, type }),
    ...options,
  });
};

export const useHrPerformanceReviews = (
  userId?: string,
  options?: Omit<
    UseQueryOptions<HrRouterOutputs["getPerformanceReviews"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<HrRouterOutputs["getPerformanceReviews"], Error>({
    queryKey: vaivammKeys.hr.performanceReviews(userId),
    queryFn: () => vaivammTrpcClient.hr.getPerformanceReviews.query({ userId }),
    ...options,
  });
};

export const useHrGoals = (
  userId?: string,
  options?: Omit<
    UseQueryOptions<HrRouterOutputs["getGoals"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<HrRouterOutputs["getGoals"], Error>({
    queryKey: vaivammKeys.hr.goals(userId),
    queryFn: () => vaivammTrpcClient.hr.getGoals.query({ userId }),
    ...options,
  });
};

export const useHrHelpdeskTickets = (
  userId?: string,
  status?: string,
  options?: Omit<
    UseQueryOptions<HrRouterOutputs["getHelpdeskTickets"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<HrRouterOutputs["getHelpdeskTickets"], Error>({
    queryKey: vaivammKeys.hr.helpdeskTickets(userId, status),
    queryFn: () =>
      vaivammTrpcClient.hr.getHelpdeskTickets.query({ userId, status }),
    ...options,
  });
};

export const useCreateDepartment = (
  options?: UseMutationOptions<
    HrRouterOutputs["createDepartment"],
    Error,
    HrRouterInputs["createDepartment"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        HrRouterOutputs["createDepartment"],
        HrRouterInputs["createDepartment"],
        unknown
      >
    | undefined;

  return useMutation<
    HrRouterOutputs["createDepartment"],
    Error,
    HrRouterInputs["createDepartment"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.hr.createDepartment.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.hr.departments() });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useUpdateProfile = (
  options?: UseMutationOptions<
    HrRouterOutputs["updateProfile"],
    Error,
    HrRouterInputs["updateProfile"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        HrRouterOutputs["updateProfile"],
        HrRouterInputs["updateProfile"],
        unknown
      >
    | undefined;

  return useMutation<
    HrRouterOutputs["updateProfile"],
    Error,
    HrRouterInputs["updateProfile"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.hr.updateProfile.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.hr.all });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useHrCheckIn = (
  options?: UseMutationOptions<
    HrRouterOutputs["checkIn"],
    Error,
    HrRouterInputs["checkIn"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        HrRouterOutputs["checkIn"],
        HrRouterInputs["checkIn"],
        unknown
      >
    | undefined;

  return useMutation<
    HrRouterOutputs["checkIn"],
    Error,
    HrRouterInputs["checkIn"],
    unknown
  >({
    mutationFn: (variables) => vaivammTrpcClient.hr.checkIn.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.hr.attendanceStatus(),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useHrCheckOut = (
  options?: UseMutationOptions<
    HrRouterOutputs["checkOut"],
    Error,
    void,
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<HrRouterOutputs["checkOut"], void, unknown>
    | undefined;

  return useMutation<HrRouterOutputs["checkOut"], Error, void, unknown>({
    mutationFn: () => vaivammTrpcClient.hr.checkOut.mutate(),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.hr.attendanceStatus(),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useHrToggleBreak = (
  options?: UseMutationOptions<
    HrRouterOutputs["toggleBreak"],
    Error,
    void,
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<HrRouterOutputs["toggleBreak"], void, unknown>
    | undefined;

  return useMutation<HrRouterOutputs["toggleBreak"], Error, void, unknown>({
    mutationFn: () => vaivammTrpcClient.hr.toggleBreak.mutate(),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.hr.attendanceStatus(),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useRequestLeave = (
  options?: UseMutationOptions<
    HrRouterOutputs["requestLeave"],
    Error,
    HrRouterInputs["requestLeave"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        HrRouterOutputs["requestLeave"],
        HrRouterInputs["requestLeave"],
        unknown
      >
    | undefined;

  return useMutation<
    HrRouterOutputs["requestLeave"],
    Error,
    HrRouterInputs["requestLeave"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.hr.requestLeave.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.hr.leaves() });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useGeneratePayroll = (
  options?: UseMutationOptions<
    HrRouterOutputs["generatePayroll"],
    Error,
    HrRouterInputs["generatePayroll"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        HrRouterOutputs["generatePayroll"],
        HrRouterInputs["generatePayroll"],
        unknown
      >
    | undefined;

  return useMutation<
    HrRouterOutputs["generatePayroll"],
    Error,
    HrRouterInputs["generatePayroll"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.hr.generatePayroll.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.hr.payrolls() });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useCreateSalaryStructure = (
  options?: UseMutationOptions<
    HrRouterOutputs["createSalaryStructure"],
    Error,
    HrRouterInputs["createSalaryStructure"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        HrRouterOutputs["createSalaryStructure"],
        HrRouterInputs["createSalaryStructure"],
        unknown
      >
    | undefined;

  return useMutation<
    HrRouterOutputs["createSalaryStructure"],
    Error,
    HrRouterInputs["createSalaryStructure"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.hr.createSalaryStructure.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.hr.salaryStructures(variables.userId),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useCreateExpense = (
  options?: UseMutationOptions<
    HrRouterOutputs["createExpense"],
    Error,
    HrRouterInputs["createExpense"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        HrRouterOutputs["createExpense"],
        HrRouterInputs["createExpense"],
        unknown
      >
    | undefined;

  return useMutation<
    HrRouterOutputs["createExpense"],
    Error,
    HrRouterInputs["createExpense"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.hr.createExpense.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.hr.expenses() });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useUpdateExpenseStatus = (
  options?: UseMutationOptions<
    HrRouterOutputs["updateExpenseStatus"],
    Error,
    HrRouterInputs["updateExpenseStatus"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        HrRouterOutputs["updateExpenseStatus"],
        HrRouterInputs["updateExpenseStatus"],
        unknown
      >
    | undefined;

  return useMutation<
    HrRouterOutputs["updateExpenseStatus"],
    Error,
    HrRouterInputs["updateExpenseStatus"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.hr.updateExpenseStatus.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.hr.expenses() });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useCreateAsset = (
  options?: UseMutationOptions<
    HrRouterOutputs["createAsset"],
    Error,
    HrRouterInputs["createAsset"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        HrRouterOutputs["createAsset"],
        HrRouterInputs["createAsset"],
        unknown
      >
    | undefined;

  return useMutation<
    HrRouterOutputs["createAsset"],
    Error,
    HrRouterInputs["createAsset"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.hr.createAsset.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.hr.assets() });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useUpdateAsset = (
  options?: UseMutationOptions<
    HrRouterOutputs["updateAsset"],
    Error,
    HrRouterInputs["updateAsset"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        HrRouterOutputs["updateAsset"],
        HrRouterInputs["updateAsset"],
        unknown
      >
    | undefined;

  return useMutation<
    HrRouterOutputs["updateAsset"],
    Error,
    HrRouterInputs["updateAsset"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.hr.updateAsset.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.hr.assets() });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useCreateDocument = (
  options?: UseMutationOptions<
    HrRouterOutputs["createDocument"],
    Error,
    HrRouterInputs["createDocument"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        HrRouterOutputs["createDocument"],
        HrRouterInputs["createDocument"],
        unknown
      >
    | undefined;

  return useMutation<
    HrRouterOutputs["createDocument"],
    Error,
    HrRouterInputs["createDocument"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.hr.createDocument.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.hr.documents() });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useCreatePerformanceReview = (
  options?: UseMutationOptions<
    HrRouterOutputs["createPerformanceReview"],
    Error,
    HrRouterInputs["createPerformanceReview"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        HrRouterOutputs["createPerformanceReview"],
        HrRouterInputs["createPerformanceReview"],
        unknown
      >
    | undefined;

  return useMutation<
    HrRouterOutputs["createPerformanceReview"],
    Error,
    HrRouterInputs["createPerformanceReview"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.hr.createPerformanceReview.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.hr.performanceReviews(variables.userId),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useCreateGoal = (
  options?: UseMutationOptions<
    HrRouterOutputs["createGoal"],
    Error,
    HrRouterInputs["createGoal"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        HrRouterOutputs["createGoal"],
        HrRouterInputs["createGoal"],
        unknown
      >
    | undefined;

  return useMutation<
    HrRouterOutputs["createGoal"],
    Error,
    HrRouterInputs["createGoal"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.hr.createGoal.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.hr.goals(variables.userId),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useUpdateGoal = (
  options?: UseMutationOptions<
    HrRouterOutputs["updateGoal"],
    Error,
    HrRouterInputs["updateGoal"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        HrRouterOutputs["updateGoal"],
        HrRouterInputs["updateGoal"],
        unknown
      >
    | undefined;

  return useMutation<
    HrRouterOutputs["updateGoal"],
    Error,
    HrRouterInputs["updateGoal"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.hr.updateGoal.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.hr.goals() });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useCreateHelpdeskTicket = (
  options?: UseMutationOptions<
    HrRouterOutputs["createHelpdeskTicket"],
    Error,
    HrRouterInputs["createHelpdeskTicket"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        HrRouterOutputs["createHelpdeskTicket"],
        HrRouterInputs["createHelpdeskTicket"],
        unknown
      >
    | undefined;

  return useMutation<
    HrRouterOutputs["createHelpdeskTicket"],
    Error,
    HrRouterInputs["createHelpdeskTicket"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.hr.createHelpdeskTicket.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.hr.helpdeskTickets(),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

// --- WORK LOGS ---
export function useGetWorkLogs(
  input: RouterInputs["hr"]["getWorkLogs"],
  options?: UseQueryOptions<RouterOutputs["hr"]["getWorkLogs"]>
) {
  return useQuery({
    queryKey: vaivammKeys.hr.workLogs(input.year, input.quarter, input.userId),
    queryFn: () => vaivammTrpcClient.hr.getWorkLogs.query(input),
    ...options,
  });
}

export function useUpsertWorkLog(
  options?: UseMutationOptions<
    RouterOutputs["hr"]["upsertWorkLog"],
    unknown,
    RouterInputs["hr"]["upsertWorkLog"]
  >
) {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        RouterOutputs["hr"]["upsertWorkLog"],
        RouterInputs["hr"]["upsertWorkLog"],
        unknown
      >
    | undefined;

  return useMutation({
    mutationFn: (input) => vaivammTrpcClient.hr.upsertWorkLog.mutate(input),
    ...options,
    onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({ queryKey: vaivammKeys.hr.all });
        if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
}

export const useProjects = (
  options?: Omit<
    UseQueryOptions<ProjectRouterOutputs["getProjects"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<ProjectRouterOutputs["getProjects"], Error>({
    queryKey: vaivammKeys.project.projects(),
    queryFn: () => vaivammTrpcClient.project.getProjects.query(),
    ...options,
  });
};

export const useProject = (
  id: number,
  options?: Omit<
    UseQueryOptions<ProjectRouterOutputs["getProjectDetails"], Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<ProjectRouterOutputs["getProjectDetails"], Error>({
    queryKey: vaivammKeys.project.project(id),
    queryFn: () => vaivammTrpcClient.project.getProjectDetails.query({ id }),
    enabled: !!id,
    ...options,
  });
};

export const useSprints = (
  projectId?: number,
  options?: Omit<
    UseQueryOptions<ProjectRouterOutputs["getSprints"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<ProjectRouterOutputs["getSprints"], Error>({
    queryKey: vaivammKeys.project.sprints(projectId),
    queryFn: () => vaivammTrpcClient.project.getSprints.query({ projectId }),
    ...options,
  });
};

export const useTicket = (
  id: number,
  options?: Omit<
    UseQueryOptions<ProjectRouterOutputs["getTicketDetails"], Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<ProjectRouterOutputs["getTicketDetails"], Error>({
    queryKey: vaivammKeys.project.ticket(id),
    queryFn: () => vaivammTrpcClient.project.getTicketDetails.query({ id }),
    enabled: !!id,
    ...options,
  });
};

export const useLabels = (
  options?: Omit<
    UseQueryOptions<ProjectRouterOutputs["getLabels"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<ProjectRouterOutputs["getLabels"], Error>({
    queryKey: vaivammKeys.project.labels(),
    queryFn: () => vaivammTrpcClient.project.getLabels.query(),
    ...options,
  });
};

export const useProjectMembers = (
  options?: Omit<
    UseQueryOptions<ProjectRouterOutputs["getProjectMembers"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<ProjectRouterOutputs["getProjectMembers"], Error>({
    queryKey: vaivammKeys.project.members(),
    queryFn: () => vaivammTrpcClient.project.getProjectMembers.query(),
    ...options,
  });
};

export const useTimeEntries = (
  ticketId?: number,
  userId?: string,
  options?: Omit<
    UseQueryOptions<ProjectRouterOutputs["getTimeEntries"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<ProjectRouterOutputs["getTimeEntries"], Error>({
    queryKey: vaivammKeys.project.timeEntries(ticketId, userId),
    queryFn: () =>
      vaivammTrpcClient.project.getTimeEntries.query({ ticketId, userId }),
    enabled: !!ticketId || !!userId,
    ...options,
  });
};

export const useSprintBurndown = (
  sprintId: number,
  options?: Omit<
    UseQueryOptions<ProjectRouterOutputs["getSprintBurndown"], Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<ProjectRouterOutputs["getSprintBurndown"], Error>({
    queryKey: vaivammKeys.project.sprintBurndown(sprintId),
    queryFn: () =>
      vaivammTrpcClient.project.getSprintBurndown.query({ sprintId }),
    enabled: !!sprintId,
    ...options,
  });
};

export const useCreateProject = (
  options?: UseMutationOptions<
    ProjectRouterOutputs["createProject"],
    Error,
    ProjectRouterInputs["createProject"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        ProjectRouterOutputs["createProject"],
        ProjectRouterInputs["createProject"],
        unknown
      >
    | undefined;

  return useMutation<
    ProjectRouterOutputs["createProject"],
    Error,
    ProjectRouterInputs["createProject"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.project.createProject.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.projects(),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useUpdateProjectSettings = (
  options?: UseMutationOptions<
    ProjectRouterOutputs["updateProjectSettings"],
    Error,
    ProjectRouterInputs["updateProjectSettings"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        ProjectRouterOutputs["updateProjectSettings"],
        ProjectRouterInputs["updateProjectSettings"],
        unknown
      >
    | undefined;

  return useMutation<
    ProjectRouterOutputs["updateProjectSettings"],
    Error,
    ProjectRouterInputs["updateProjectSettings"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.project.updateProjectSettings.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.project(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.projects(),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useDeleteProject = (
  options?: UseMutationOptions<
    ProjectRouterOutputs["deleteProject"],
    Error,
    ProjectRouterInputs["deleteProject"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        ProjectRouterOutputs["deleteProject"],
        ProjectRouterInputs["deleteProject"],
        unknown
      >
    | undefined;

  return useMutation<
    ProjectRouterOutputs["deleteProject"],
    Error,
    ProjectRouterInputs["deleteProject"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.project.deleteProject.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.projects(),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useCreateSprint = (
  options?: UseMutationOptions<
    ProjectRouterOutputs["createSprint"],
    Error,
    ProjectRouterInputs["createSprint"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        ProjectRouterOutputs["createSprint"],
        ProjectRouterInputs["createSprint"],
        unknown
      >
    | undefined;

  return useMutation<
    ProjectRouterOutputs["createSprint"],
    Error,
    ProjectRouterInputs["createSprint"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.project.createSprint.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.sprints(variables.projectId),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useUpdateSprint = (
  options?: UseMutationOptions<
    ProjectRouterOutputs["updateSprint"],
    Error,
    ProjectRouterInputs["updateSprint"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        ProjectRouterOutputs["updateSprint"],
        ProjectRouterInputs["updateSprint"],
        unknown
      >
    | undefined;

  return useMutation<
    ProjectRouterOutputs["updateSprint"],
    Error,
    ProjectRouterInputs["updateSprint"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.project.updateSprint.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.sprints(),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useCreateTicket = (
  options?: UseMutationOptions<
    ProjectRouterOutputs["createTicket"],
    Error,
    ProjectRouterInputs["createTicket"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        ProjectRouterOutputs["createTicket"],
        ProjectRouterInputs["createTicket"],
        unknown
      >
    | undefined;

  return useMutation<
    ProjectRouterOutputs["createTicket"],
    Error,
    ProjectRouterInputs["createTicket"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.project.createTicket.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.project(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.projects(),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useUpdateTicket = (
  options?: UseMutationOptions<
    ProjectRouterOutputs["updateTicket"],
    Error,
    ProjectRouterInputs["updateTicket"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        ProjectRouterOutputs["updateTicket"],
        ProjectRouterInputs["updateTicket"],
        unknown
      >
    | undefined;

  return useMutation<
    ProjectRouterOutputs["updateTicket"],
    Error,
    ProjectRouterInputs["updateTicket"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.project.updateTicket.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.ticket(variables.ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.projects(),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useUpdateTicketStatus = (
  options?: UseMutationOptions<
    ProjectRouterOutputs["updateTicketStatus"],
    Error,
    ProjectRouterInputs["updateTicketStatus"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        ProjectRouterOutputs["updateTicketStatus"],
        ProjectRouterInputs["updateTicketStatus"],
        unknown
      >
    | undefined;

  return useMutation<
    ProjectRouterOutputs["updateTicketStatus"],
    Error,
    ProjectRouterInputs["updateTicketStatus"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.project.updateTicketStatus.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.ticket(variables.ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.projects(),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useUpdateTicketOrder = (
  options?: UseMutationOptions<
    ProjectRouterOutputs["updateTicketOrder"],
    Error,
    ProjectRouterInputs["updateTicketOrder"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        ProjectRouterOutputs["updateTicketOrder"],
        ProjectRouterInputs["updateTicketOrder"],
        unknown
      >
    | undefined;

  return useMutation<
    ProjectRouterOutputs["updateTicketOrder"],
    Error,
    ProjectRouterInputs["updateTicketOrder"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.project.updateTicketOrder.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.project(variables.projectId),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useDeleteTicket = (
  options?: UseMutationOptions<
    ProjectRouterOutputs["deleteTicket"],
    Error,
    ProjectRouterInputs["deleteTicket"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        ProjectRouterOutputs["deleteTicket"],
        ProjectRouterInputs["deleteTicket"],
        unknown
      >
    | undefined;

  return useMutation<
    ProjectRouterOutputs["deleteTicket"],
    Error,
    ProjectRouterInputs["deleteTicket"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.project.deleteTicket.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.projects(),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useAddComment = (
  options?: UseMutationOptions<
    ProjectRouterOutputs["addComment"],
    Error,
    ProjectRouterInputs["addComment"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        ProjectRouterOutputs["addComment"],
        ProjectRouterInputs["addComment"],
        unknown
      >
    | undefined;

  return useMutation<
    ProjectRouterOutputs["addComment"],
    Error,
    ProjectRouterInputs["addComment"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.project.addComment.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.ticket(variables.ticketId),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useAddAttachment = (
  options?: UseMutationOptions<
    ProjectRouterOutputs["addAttachment"],
    Error,
    ProjectRouterInputs["addAttachment"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        ProjectRouterOutputs["addAttachment"],
        ProjectRouterInputs["addAttachment"],
        unknown
      >
    | undefined;

  return useMutation<
    ProjectRouterOutputs["addAttachment"],
    Error,
    ProjectRouterInputs["addAttachment"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.project.addAttachment.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.ticket(variables.ticketId),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useCreateLabel = (
  options?: UseMutationOptions<
    ProjectRouterOutputs["createLabel"],
    Error,
    ProjectRouterInputs["createLabel"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        ProjectRouterOutputs["createLabel"],
        ProjectRouterInputs["createLabel"],
        unknown
      >
    | undefined;

  return useMutation<
    ProjectRouterOutputs["createLabel"],
    Error,
    ProjectRouterInputs["createLabel"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.project.createLabel.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.project.labels() });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useAddLabelToTicket = (
  options?: UseMutationOptions<
    ProjectRouterOutputs["addLabelToTicket"],
    Error,
    ProjectRouterInputs["addLabelToTicket"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        ProjectRouterOutputs["addLabelToTicket"],
        ProjectRouterInputs["addLabelToTicket"],
        unknown
      >
    | undefined;

  return useMutation<
    ProjectRouterOutputs["addLabelToTicket"],
    Error,
    ProjectRouterInputs["addLabelToTicket"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.project.addLabelToTicket.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.ticket(variables.ticketId),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useRemoveLabelFromTicket = (
  options?: UseMutationOptions<
    ProjectRouterOutputs["removeLabelFromTicket"],
    Error,
    ProjectRouterInputs["removeLabelFromTicket"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        ProjectRouterOutputs["removeLabelFromTicket"],
        ProjectRouterInputs["removeLabelFromTicket"],
        unknown
      >
    | undefined;

  return useMutation<
    ProjectRouterOutputs["removeLabelFromTicket"],
    Error,
    ProjectRouterInputs["removeLabelFromTicket"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.project.removeLabelFromTicket.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.ticket(variables.ticketId),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useAddTimeEntry = (
  options?: UseMutationOptions<
    ProjectRouterOutputs["addTimeEntry"],
    Error,
    ProjectRouterInputs["addTimeEntry"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        ProjectRouterOutputs["addTimeEntry"],
        ProjectRouterInputs["addTimeEntry"],
        unknown
      >
    | undefined;

  return useMutation<
    ProjectRouterOutputs["addTimeEntry"],
    Error,
    ProjectRouterInputs["addTimeEntry"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.project.addTimeEntry.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.timeEntries(variables.ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.ticket(variables.ticketId),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useDashboardStats = (
  options?: Omit<
    UseQueryOptions<DashboardRouterOutputs["getStats"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<DashboardRouterOutputs["getStats"], Error>({
    queryKey: vaivammKeys.dashboard.stats(),
    queryFn: () => vaivammTrpcClient.dashboard.getStats.query(),
    ...options,
  });
};

export const useRecentProjects = (
  options?: Omit<
    UseQueryOptions<DashboardRouterOutputs["getRecentProjects"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<DashboardRouterOutputs["getRecentProjects"], Error>({
    queryKey: vaivammKeys.dashboard.recentProjects(),
    queryFn: () => vaivammTrpcClient.dashboard.getRecentProjects.query(),
    ...options,
  });
};

export const useTeamAvailability = (
  options?: Omit<
    UseQueryOptions<DashboardRouterOutputs["getTeamAvailability"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<DashboardRouterOutputs["getTeamAvailability"], Error>({
    queryKey: vaivammKeys.dashboard.teamAvailability(),
    queryFn: () => vaivammTrpcClient.dashboard.getTeamAvailability.query(),
    ...options,
  });
};

export const useEmployeeTickets = (
  userId: string,
  options?: Omit<
    UseQueryOptions<ProjectRouterOutputs["getEmployeeTickets"], Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<ProjectRouterOutputs["getEmployeeTickets"], Error>({
    queryKey: vaivammKeys.dashboard.myIssues(userId),
    queryFn: () => vaivammTrpcClient.project.getEmployeeTickets.query({ userId, limit: 20 }),
    enabled: !!userId,
    ...options,
  });
};

export const useSubtasks = (
  parentTicketId: number,
  options?: Omit<
    UseQueryOptions<ProjectRouterOutputs["getSubtasks"], Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<ProjectRouterOutputs["getSubtasks"], Error>({
    queryKey: [...vaivammKeys.project.all, "subtasks", { parentTicketId }],
    queryFn: () => vaivammTrpcClient.project.getSubtasks.query({ parentTicketId }),
    enabled: !!parentTicketId,
    ...options,
  });
};

export const useActiveSprintSummary = (
  options?: Omit<
    UseQueryOptions<DashboardRouterOutputs["getActiveSprintSummary"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<DashboardRouterOutputs["getActiveSprintSummary"], Error>({
    queryKey: vaivammKeys.dashboard.activeSprintSummary(),
    queryFn: () => vaivammTrpcClient.dashboard.getActiveSprintSummary.query(),
    ...options,
  });
};

export const useRecentActivity = (
  options?: Omit<
    UseQueryOptions<DashboardRouterOutputs["getRecentActivity"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<DashboardRouterOutputs["getRecentActivity"], Error>({
    queryKey: vaivammKeys.dashboard.recentActivity(),
    queryFn: () => vaivammTrpcClient.dashboard.getRecentActivity.query(),
    ...options,
  });
};

export const useRbacUserPermissions = (
  options?: Omit<
    UseQueryOptions<RbacRouterOutputs["getUserPermissions"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<RbacRouterOutputs["getUserPermissions"], Error>({
    queryKey: vaivammKeys.rbac.userPermissions(),
    queryFn: () => vaivammTrpcClient.rbac.getUserPermissions.query(),
    ...options,
  });
};

export const useRbacAllPermissions = (
  options?: Omit<
    UseQueryOptions<RbacRouterOutputs["getAllPermissions"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<RbacRouterOutputs["getAllPermissions"], Error>({
    queryKey: vaivammKeys.rbac.allPermissions(),
    queryFn: () => vaivammTrpcClient.rbac.getAllPermissions.query(),
    ...options,
  });
};

export const useRbacCheckPermission = (
  permission: string,
  options?: Omit<
    UseQueryOptions<RbacRouterOutputs["checkPermission"], Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<RbacRouterOutputs["checkPermission"], Error>({
    queryKey: [...vaivammKeys.rbac.all, "checkPermission", { permission }],
    queryFn: () => vaivammTrpcClient.rbac.checkPermission.query({ permission }),
    enabled: !!permission,
    ...options,
  });
};

export const useRbacRolePermissions = (
  role: "OWNER" | "ADMIN" | "MEMBER",
  options?: Omit<
    UseQueryOptions<RbacRouterOutputs["getRolePermissions"], Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<RbacRouterOutputs["getRolePermissions"], Error>({
    queryKey: vaivammKeys.rbac.rolePermissions(role),
    queryFn: () => vaivammTrpcClient.rbac.getRolePermissions.query({ role }),
    enabled: !!role,
    ...options,
  });
};

export const useRbacAssignRolePermission = (
  options?: UseMutationOptions<
    RbacRouterOutputs["assignRolePermission"],
    Error,
    RbacRouterInputs["assignRolePermission"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        RbacRouterOutputs["assignRolePermission"],
        RbacRouterInputs["assignRolePermission"],
        unknown
      >
    | undefined;

  return useMutation<
    RbacRouterOutputs["assignRolePermission"],
    Error,
    RbacRouterInputs["assignRolePermission"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.rbac.assignRolePermission.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.rbac.rolePermissions(variables.role),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useRbacAssignUserPermission = (
  options?: UseMutationOptions<
    RbacRouterOutputs["assignUserPermission"],
    Error,
    RbacRouterInputs["assignUserPermission"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        RbacRouterOutputs["assignUserPermission"],
        RbacRouterInputs["assignUserPermission"],
        unknown
      >
    | undefined;

  return useMutation<
    RbacRouterOutputs["assignUserPermission"],
    Error,
    RbacRouterInputs["assignUserPermission"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.rbac.assignUserPermission.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.rbac.userPermissions(),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useReportsAttendance = (
  userId?: string,
  startDate?: Date,
  endDate?: Date,
  options?: Omit<
    UseQueryOptions<ReportsRouterOutputs["getAttendanceReport"], Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<ReportsRouterOutputs["getAttendanceReport"], Error>({
    queryKey: vaivammKeys.reports.attendance(userId, startDate, endDate),
    queryFn: () =>
      vaivammTrpcClient.reports.getAttendanceReport.query({
        userId,
        startDate: startDate!,
        endDate: endDate!,
      }),
    enabled: !!startDate && !!endDate,
    ...options,
  });
};

export const useReportsPayroll = (
  userId?: string,
  startMonth?: string,
  endMonth?: string,
  options?: Omit<
    UseQueryOptions<ReportsRouterOutputs["getPayrollReport"], Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<ReportsRouterOutputs["getPayrollReport"], Error>({
    queryKey: vaivammKeys.reports.payroll(userId, startMonth, endMonth),
    queryFn: () =>
      vaivammTrpcClient.reports.getPayrollReport.query({
        userId,
        startMonth: startMonth!,
        endMonth: endMonth!,
      }),
    enabled: !!startMonth && !!endMonth,
    ...options,
  });
};

export const useReportsProject = (
  projectId?: number,
  startDate?: Date,
  endDate?: Date,
  options?: Omit<
    UseQueryOptions<ReportsRouterOutputs["getProjectReport"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<ReportsRouterOutputs["getProjectReport"], Error>({
    queryKey: vaivammKeys.reports.project(projectId, startDate, endDate),
    queryFn: () =>
      vaivammTrpcClient.reports.getProjectReport.query({
        projectId,
        startDate,
        endDate,
      }),
    ...options,
  });
};

export const useReportsTeamPerformance = (
  startDate?: Date,
  endDate?: Date,
  options?: Omit<
    UseQueryOptions<ReportsRouterOutputs["getTeamPerformanceReport"], Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<ReportsRouterOutputs["getTeamPerformanceReport"], Error>({
    queryKey: vaivammKeys.reports.teamPerformance(startDate, endDate),
    queryFn: () =>
      vaivammTrpcClient.reports.getTeamPerformanceReport.query({
        startDate: startDate!,
        endDate: endDate!,
      }),
    enabled: !!startDate && !!endDate,
    ...options,
  });
};

export const useReportsDashboardStats = (
  options?: Omit<
    UseQueryOptions<ReportsRouterOutputs["getDashboardStats"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<ReportsRouterOutputs["getDashboardStats"], Error>({
    queryKey: vaivammKeys.reports.dashboardStats(),
    queryFn: () => vaivammTrpcClient.reports.getDashboardStats.query(),
    ...options,
  });
};

export const useCreateProjectStatus = (
  options?: UseMutationOptions<
    ProjectRouterOutputs["createProjectStatus"],
    Error,
    ProjectRouterInputs["createProjectStatus"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        ProjectRouterOutputs["createProjectStatus"],
        ProjectRouterInputs["createProjectStatus"],
        unknown
      >
    | undefined;

  return useMutation<
    ProjectRouterOutputs["createProjectStatus"],
    Error,
    ProjectRouterInputs["createProjectStatus"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.project.createProjectStatus.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.project(variables.projectId),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useUpdateProjectStatusOrder = (
  options?: UseMutationOptions<
    ProjectRouterOutputs["updateProjectStatusOrder"],
    Error,
    ProjectRouterInputs["updateProjectStatusOrder"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        ProjectRouterOutputs["updateProjectStatusOrder"],
        ProjectRouterInputs["updateProjectStatusOrder"],
        unknown
      >
    | undefined;

  return useMutation<
    ProjectRouterOutputs["updateProjectStatusOrder"],
    Error,
    ProjectRouterInputs["updateProjectStatusOrder"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.project.updateProjectStatusOrder.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.project(variables.projectId),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};

export const useDeleteProjectStatus = (
  options?: UseMutationOptions<
    ProjectRouterOutputs["deleteProjectStatus"],
    Error,
    ProjectRouterInputs["deleteProjectStatus"],
    unknown
  >
) => {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess as
    | MutationOnSuccess<
        ProjectRouterOutputs["deleteProjectStatus"],
        ProjectRouterInputs["deleteProjectStatus"],
        unknown
      >
    | undefined;

  return useMutation<
    ProjectRouterOutputs["deleteProjectStatus"],
    Error,
    ProjectRouterInputs["deleteProjectStatus"],
    unknown
  >({
    mutationFn: (variables) =>
      vaivammTrpcClient.project.deleteProjectStatus.mutate(variables),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.project(variables.projectId),
      });
      if (userOnSuccess) userOnSuccess(data, variables, context);
    },
  });
};
