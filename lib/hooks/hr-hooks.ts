import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import { vaivammTrpcClient, RouterInputs, RouterOutputs } from "../trpc";
import { vaivammKeys } from "./trpc-keys";
import type { MutationOnSuccess, HrRouterOutputs, HrRouterInputs } from "./trpc-keys";

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
  status?: "PENDING" | "APPROVED" | "REJECTED" | "PAID",
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
  type?: "CONTRACT" | "CERTIFICATE" | "ID_PROOF" | "PAYSLIP" | "POLICY" | "OFFER_LETTER" | "RESUME" | "OTHER",
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
  status?: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE",
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
