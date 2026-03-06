import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import { vaivammTrpcClient } from "../trpc";
import { vaivammKeys } from "./trpc-keys";
import type { MutationOnSuccess, ProjectRouterOutputs, ProjectRouterInputs } from "./trpc-keys";

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
