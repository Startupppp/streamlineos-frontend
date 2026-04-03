"use client";

/**
 * TanStack Query hooks for the Projects domain.
 * All hooks use apiClient (Axios) and queryKeys — zero tRPC imports.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Project,
  ProjectListItem,
  ProjectWithDetails,
  ProjectMember,
  Ticket,
  TicketLabel,
  Sprint,
  SprintBurndown,
  TimeEntry,
  TimeEntryWithUser,
  Epic,
  Cycle,
  Module,
  ProjectPage,
  ProjectView,
  IntakeRequest,
  ProjectAnalytics,
  CustomState,
  PaginatedResponse,
  ProjectFilters,
  TicketFilters,
  TimeEntryFilters,
  CreateProjectInput,
  UpdateProjectInput,
  CreateTicketInput,
  UpdateTicketInput,
  MoveTicketInput,
  CreateSprintInput,
  UpdateSprintInput,
  LogTimeInput,
  UpdateTimeEntryInput,
  CreateLabelInput,
  AddProjectMemberInput,
  CreateCycleInput,
  UpdateCycleInput,
  CreateModuleInput,
  UpdateModuleInput,
  CreatePageInput,
  UpdatePageInput,
  CreateViewInput,
  UpdateViewInput,
  CreateIntakeRequestInput,
  UpdateIntakeRequestInput,
} from "@/types/projects";

// ─── Projects ─────────────────────────────────────────────────────────────────

export function useProjects(
  filters?: ProjectFilters,
  options?: Omit<UseQueryOptions<PaginatedResponse<ProjectListItem>>, "queryKey" | "queryFn">
) {
  return useQuery<PaginatedResponse<ProjectListItem>>({
    queryKey: queryKeys.projects.list(),
    queryFn: () =>
      apiClient.get<PaginatedResponse<ProjectListItem>>("/projects", filters as Record<string, unknown>),
    ...options,
  });
}

export function useProject(
  id: number,
  options?: Omit<UseQueryOptions<ProjectWithDetails | null>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<ProjectWithDetails | null>({
    queryKey: queryKeys.projects.detail(id),
    queryFn: () => apiClient.get<ProjectWithDetails | null>(`/projects/${id}`),
    enabled: !!id,
    ...options,
  });
}

export function useCreateProject(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectInput) => apiClient.post<Project>("/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    ...options,
  });
}

export function useUpdateProject(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...data }: UpdateProjectInput) =>
      apiClient.patch<{ success: boolean }>(`/projects/${projectId}`, data),
    onSuccess: (_data: unknown, variables: UpdateProjectInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    ...options,
  });
}

export function useDeleteProject(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { projectId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { projectId: number }>({
    mutationFn: ({ projectId }) =>
      apiClient.delete<{ success: boolean }>(`/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    ...options,
  });
}

// ─── Project Members ──────────────────────────────────────────────────────────

export function useProjectMembers(
  projectId: number,
  options?: Omit<UseQueryOptions<ProjectMember[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<ProjectMember[]>({
    queryKey: queryKeys.projects.members(projectId),
    queryFn: () => apiClient.get<ProjectMember[]>(`/projects/${projectId}/members`),
    enabled: !!projectId,
    ...options,
  });
}

export function useAddProjectMember(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...data }: AddProjectMemberInput) =>
      apiClient.post<ProjectMember>(`/projects/${projectId}/members`, data),
    onSuccess: (_data: unknown, variables: AddProjectMemberInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.members(variables.projectId),
      });
    },
    ...options,
  });
}

export function useRemoveProjectMember(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, userId }: { projectId: number; userId: string }) =>
      apiClient.delete<{ success: boolean }>(`/projects/${projectId}/members`, {
        data: { userId },
      }),
    onSuccess: (_data: unknown, variables: { projectId: number; userId: string }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.members(variables.projectId),
      });
    },
    ...options,
  });
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export function useProjectLabels(
  projectId?: number,
  options?: Omit<UseQueryOptions<TicketLabel[]>, "queryKey" | "queryFn">
) {
  return useQuery<TicketLabel[]>({
    queryKey: queryKeys.projects.labels(projectId),
    queryFn: () =>
      projectId
        ? apiClient.get<TicketLabel[]>(`/projects/${projectId}/labels`)
        : apiClient.get<TicketLabel[]>("/projects/labels"),
    ...options,
  });
}

export function useCreateLabel(
  projectId: number,
  options?: Parameters<typeof useMutation>[0]
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLabelInput) =>
      apiClient.post<TicketLabel>(`/projects/${projectId}/labels`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.labels(projectId),
      });
    },
    ...options,
  });
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export function useTickets(
  projectId: number,
  filters?: TicketFilters,
  options?: Omit<UseQueryOptions<PaginatedResponse<Ticket>>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<PaginatedResponse<Ticket>>({
    queryKey: queryKeys.projects.tickets({ projectId, ...filters }),
    queryFn: () =>
      apiClient.get<PaginatedResponse<Ticket>>(`/projects/${projectId}/tickets`, filters as Record<string, unknown>),
    enabled: !!projectId,
    ...options,
  });
}

export function useTicket(
  projectId: number,
  ticketId: number,
  options?: Omit<UseQueryOptions<Ticket | null>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<Ticket | null>({
    queryKey: queryKeys.projects.ticket(ticketId),
    queryFn: () =>
      apiClient.get<Ticket | null>(`/projects/${projectId}/tickets/${ticketId}`),
    enabled: !!ticketId && !!projectId,
    ...options,
  });
}

export function useCreateTicket(
  options?: Omit<UseMutationOptions<Ticket, Error, CreateTicketInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<Ticket, Error, CreateTicketInput>({
    mutationFn: ({ projectId, ...data }) =>
      apiClient.post<Ticket>(`/projects/${projectId}/tickets`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.tickets({ projectId: variables.projectId }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdateTicket(
  projectId: number,
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, UpdateTicketInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, UpdateTicketInput>({
    mutationFn: ({ ticketId, ...data }) =>
      apiClient.patch<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}`,
        data
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.tickets({ projectId }),
      });
    },
    ...options,
  });
}

export function useDeleteTicket(
  projectId: number,
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { ticketId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { ticketId: number }>({
    mutationFn: ({ ticketId }) =>
      apiClient.delete<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.tickets({ projectId }),
      });
    },
    ...options,
  });
}

export function useMoveTicket(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, items }: MoveTicketInput) =>
      apiClient.patch<{ success: boolean }>(`/projects/${projectId}/tickets/reorder`, { items }),
    onSuccess: (_data: unknown, variables: MoveTicketInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
    },
    ...options,
  });
}

// ─── Sprints ──────────────────────────────────────────────────────────────────

export function useSprints(
  projectId?: number,
  options?: Omit<UseQueryOptions<Sprint[]>, "queryKey" | "queryFn">
) {
  return useQuery<Sprint[]>({
    queryKey: queryKeys.projects.sprints(projectId),
    queryFn: () =>
      projectId
        ? apiClient.get<Sprint[]>(`/projects/${projectId}/sprints`)
        : apiClient.get<Sprint[]>("/projects/sprints"),
    ...options,
  });
}

export function useSprint(
  projectId: number,
  sprintId: number,
  options?: Omit<UseQueryOptions<Sprint | null>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<Sprint | null>({
    queryKey: queryKeys.projects.sprint(sprintId),
    queryFn: () =>
      apiClient.get<Sprint | null>(`/projects/${projectId}/sprints/${sprintId}`),
    enabled: !!sprintId && !!projectId,
    ...options,
  });
}

export function useCreateSprint(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...data }: CreateSprintInput) =>
      apiClient.post<Sprint>(`/projects/${projectId}/sprints`, data),
    onSuccess: (_data: unknown, variables: CreateSprintInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.sprints(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdateSprint(
  projectId: number,
  options?: Parameters<typeof useMutation>[0]
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId, ...data }: UpdateSprintInput) =>
      apiClient.patch<{ success: boolean }>(
        `/projects/${projectId}/sprints/${sprintId}`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.sprints(projectId),
      });
    },
    ...options,
  });
}

export function useStartSprint(
  projectId: number,
  options?: Parameters<typeof useMutation>[0]
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId }: { sprintId: number }) =>
      apiClient.patch<{ success: boolean }>(
        `/projects/${projectId}/sprints/${sprintId}`,
        { status: "ACTIVE" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.sprints(projectId),
      });
    },
    ...options,
  });
}

export function useCompleteSprint(
  projectId: number,
  options?: Parameters<typeof useMutation>[0]
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId }: { sprintId: number }) =>
      apiClient.patch<{ success: boolean }>(
        `/projects/${projectId}/sprints/${sprintId}`,
        { status: "COMPLETED" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.sprints(projectId),
      });
    },
    ...options,
  });
}

export function useSprintBurndown(
  projectId: number,
  sprintId: number,
  options?: Omit<UseQueryOptions<SprintBurndown>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<SprintBurndown>({
    queryKey: queryKeys.projects.burndown(sprintId),
    queryFn: () =>
      apiClient.get<SprintBurndown>(
        `/projects/${projectId}/sprints/${sprintId}/burndown`
      ),
    enabled: !!sprintId && !!projectId,
    ...options,
  });
}

// ─── Time Entries ─────────────────────────────────────────────────────────────

export function useTimeEntries(
  filters?: TimeEntryFilters,
  options?: Omit<UseQueryOptions<TimeEntryWithUser[]>, "queryKey" | "queryFn">
) {
  return useQuery<TimeEntryWithUser[]>({
    queryKey: queryKeys.projects.timeEntries(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<TimeEntryWithUser[]>("/projects/time-entries", filters as Record<string, unknown>),
    ...options,
  });
}

export function useMyTimeEntries(
  userId: string,
  filters?: Omit<TimeEntryFilters, "userId">,
  options?: Omit<UseQueryOptions<TimeEntryWithUser[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<TimeEntryWithUser[]>({
    queryKey: queryKeys.projects.timeEntries({ userId, ...filters }),
    queryFn: () =>
      apiClient.get<TimeEntryWithUser[]>("/projects/time-entries", {
        userId,
        ...(filters as Record<string, unknown>),
      }),
    enabled: !!userId,
    ...options,
  });
}

export function useLogTime(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, ...data }: LogTimeInput) =>
      apiClient.post<TimeEntry>(
        `/projects/0/tickets/${ticketId}/time-entries`,
        data
      ),
    onSuccess: (_data: unknown, variables: LogTimeInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.timeEntries(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
    ...options,
  });
}

export function useUpdateTimeEntry(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, ...data }: UpdateTimeEntryInput) =>
      apiClient.patch<TimeEntry>(`/projects/time-entries/${entryId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.timeEntries(),
      });
    },
    ...options,
  });
}

export function useDeleteTimeEntry(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId }: { entryId: number }) =>
      apiClient.delete<{ success: boolean }>(`/projects/time-entries/${entryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.timeEntries(),
      });
    },
    ...options,
  });
}

// ─── Epics ────────────────────────────────────────────────────────────────────

export function useEpics(
  projectId: number,
  options?: Omit<UseQueryOptions<Epic[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<Epic[]>({
    queryKey: queryKeys.projects.epics(projectId),
    queryFn: () => apiClient.get<Epic[]>(`/projects/${projectId}/epics`),
    enabled: !!projectId,
    ...options,
  });
}

export type CreateEpicInput = {
  projectId: number;
  title: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
  points?: number;
};

export function useCreateEpic(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: CreateEpicInput) => {
      const { projectId, ...data } = variables;
      return apiClient.post<Epic>(`/projects/${projectId}/epics`, data);
    },
    onSuccess: (_data: unknown, variables: CreateEpicInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.epics(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdateEpic(
  projectId: number,
  options?: Parameters<typeof useMutation>[0]
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, ...data }: UpdateTicketInput) =>
      apiClient.patch<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.epics(projectId),
      });
    },
    ...options,
  });
}

// ─── Cycles ───────────────────────────────────────────────────────────────────

export function useCycles(
  projectId: number,
  options?: Omit<UseQueryOptions<Cycle[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<Cycle[]>({
    queryKey: queryKeys.projects.cycles(projectId),
    queryFn: () => apiClient.get<Cycle[]>(`/projects/${projectId}/cycles`),
    enabled: !!projectId,
    ...options,
  });
}

export function useCreateCycle(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...data }: CreateCycleInput) =>
      apiClient.post<Cycle>(`/projects/${projectId}/cycles`, data),
    onSuccess: (_data: unknown, variables: CreateCycleInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.cycles(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdateCycle(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, ...data }: UpdateCycleInput & { projectId: number }) =>
      apiClient.patch<Cycle>(`/projects/${projectId}/cycles/${id}`, data),
    onSuccess: (_data: unknown, variables: UpdateCycleInput & { projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.cycles(variables.projectId),
      });
    },
    ...options,
  });
}

// ─── Modules ──────────────────────────────────────────────────────────────────

export function useModules(
  projectId: number,
  options?: Omit<UseQueryOptions<Module[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<Module[]>({
    queryKey: queryKeys.projects.modules(projectId),
    queryFn: () => apiClient.get<Module[]>(`/projects/${projectId}/modules`),
    enabled: !!projectId,
    ...options,
  });
}

export function useCreateModule(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...data }: CreateModuleInput) =>
      apiClient.post<Module>(`/projects/${projectId}/modules`, data),
    onSuccess: (_data: unknown, variables: CreateModuleInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.modules(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdateModule(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, ...data }: UpdateModuleInput & { projectId: number }) =>
      apiClient.patch<Module>(`/projects/${projectId}/modules/${id}`, data),
    onSuccess: (_data: unknown, variables: UpdateModuleInput & { projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.modules(variables.projectId),
      });
    },
    ...options,
  });
}

// ─── Pages ────────────────────────────────────────────────────────────────────

export function usePages(
  projectId: number,
  options?: Omit<UseQueryOptions<ProjectPage[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<ProjectPage[]>({
    queryKey: queryKeys.projects.pages(projectId),
    queryFn: () => apiClient.get<ProjectPage[]>(`/projects/${projectId}/pages`),
    enabled: !!projectId,
    ...options,
  });
}

export function useCreatePage(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...data }: CreatePageInput) =>
      apiClient.post<ProjectPage>(`/projects/${projectId}/pages`, data),
    onSuccess: (_data: unknown, variables: CreatePageInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.pages(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdatePage(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, ...data }: UpdatePageInput & { projectId: number }) =>
      apiClient.patch<ProjectPage>(`/projects/${projectId}/pages/${id}`, data),
    onSuccess: (_data: unknown, variables: UpdatePageInput & { projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.pages(variables.projectId),
      });
    },
    ...options,
  });
}

// ─── Views ────────────────────────────────────────────────────────────────────

export function useViews(
  projectId: number,
  options?: Omit<UseQueryOptions<ProjectView[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<ProjectView[]>({
    queryKey: queryKeys.projects.views(projectId),
    queryFn: () => apiClient.get<ProjectView[]>(`/projects/${projectId}/views`),
    enabled: !!projectId,
    ...options,
  });
}

export function useCreateView(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...data }: CreateViewInput) =>
      apiClient.post<ProjectView>(`/projects/${projectId}/views`, data),
    onSuccess: (_data: unknown, variables: CreateViewInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.views(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdateView(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, ...data }: UpdateViewInput & { projectId: number }) =>
      apiClient.patch<ProjectView>(`/projects/${projectId}/views/${id}`, data),
    onSuccess: (_data: unknown, variables: UpdateViewInput & { projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.views(variables.projectId),
      });
    },
    ...options,
  });
}

export function useDeleteView(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: number; projectId: number }) =>
      apiClient.delete<{ success: boolean }>(`/projects/${projectId}/views/${id}`),
    onSuccess: (_data: unknown, variables: { id: number; projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.views(variables.projectId),
      });
    },
    ...options,
  });
}

// ─── Intake ───────────────────────────────────────────────────────────────────

export function useIntakeRequests(
  projectId: number,
  status?: string,
  options?: Omit<
    UseQueryOptions<{ items: IntakeRequest[]; total: number }>,
    "queryKey" | "queryFn" | "enabled"
  >
) {
  return useQuery<{ items: IntakeRequest[]; total: number }>({
    queryKey: queryKeys.projects.intake(projectId),
    queryFn: () =>
      apiClient.get<{ items: IntakeRequest[]; total: number }>(
        `/projects/${projectId}/intake`,
        status ? { status } : undefined
      ),
    enabled: !!projectId,
    ...options,
  });
}

export function useCreateIntakeRequest(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...data }: CreateIntakeRequestInput) =>
      apiClient.post<IntakeRequest>(`/projects/${projectId}/intake`, data),
    onSuccess: (_data: unknown, variables: CreateIntakeRequestInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.intake(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdateIntakeRequest(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, ...data }: UpdateIntakeRequestInput & { projectId: number }) =>
      apiClient.patch<{ success: boolean }>(
        `/projects/${projectId}/intake/${id}`,
        data
      ),
    onSuccess: (_data: unknown, variables: UpdateIntakeRequestInput & { projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.intake(variables.projectId),
      });
    },
    ...options,
  });
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export function useProjectAnalytics(
  projectId: number,
  options?: Omit<UseQueryOptions<ProjectAnalytics>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<ProjectAnalytics>({
    queryKey: queryKeys.projects.analytics(projectId),
    queryFn: () =>
      apiClient.get<ProjectAnalytics>(`/projects/${projectId}/analytics`),
    enabled: !!projectId,
    ...options,
  });
}

// ─── Custom States ────────────────────────────────────────────────────────────

export function useCustomStates(
  projectId: number,
  options?: Omit<UseQueryOptions<CustomState[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<CustomState[]>({
    queryKey: [...queryKeys.projects.all, "customStates", projectId] as const,
    queryFn: () =>
      apiClient.get<CustomState[]>(`/projects/${projectId}/custom-states`),
    enabled: !!projectId,
    ...options,
  });
}


// ─── Team Timesheets (CEO/Admin) ──────────────────────────────────────────────

export interface TeamTimesheetFilters {
  userId?: string;
  projectId?: number;
  startDate?: string;
  endDate?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
}

export function useAllTeamTimesheets(
  filters?: TeamTimesheetFilters,
  options?: Omit<UseQueryOptions<TimeEntryWithUser[]>, "queryKey" | "queryFn">
) {
  return useQuery<TimeEntryWithUser[]>({
    queryKey: [...queryKeys.projects.timeEntries(filters as Record<string, unknown>), "team"] as const,
    queryFn: () =>
      apiClient.get<TimeEntryWithUser[]>("/projects/time-entries/team", filters as Record<string, unknown>),
    ...options,
  });
}

export function useApproveTimesheet(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ timesheetId }: { timesheetId: number }) =>
      apiClient.patch<{ success: boolean }>(`/projects/time-entries/${timesheetId}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.timeEntries() });
    },
    ...options,
  });
}

export function useRejectTimesheet(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ timesheetId, reason }: { timesheetId: number; reason?: string }) =>
      apiClient.patch<{ success: boolean }>(`/projects/time-entries/${timesheetId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.timeEntries() });
    },
    ...options,
  });
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export interface BillingSummaryItem {
  projectId: number;
  projectName: string;
  totalHours: number | null;
}

export function useBillingSummary(params: { startDate: Date; endDate: Date }) {
  return useQuery<BillingSummaryItem[]>({
    queryKey: [...queryKeys.projects.all, "billingSummary", params.startDate, params.endDate] as const,
    queryFn: () =>
      apiClient.get<BillingSummaryItem[]>("/projects/billing-summary", {
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
      }),
  });
}

// ─── Backward-compatibility aliases ──────────────────────────────────────────
// These hooks existed in the old lib/hooks/project-hooks.ts and are still
// referenced by legacy components. They forward to the canonical implementations.

/** Alias for useProjectLabels() — fetches all labels across the org. */
export function useLabels(options?: Omit<UseQueryOptions<TicketLabel[]>, "queryKey" | "queryFn">) {
  return useProjectLabels(undefined, options);
}

/**
 * Backward-compat useUpdateTicket that doesn't require projectId as first arg.
 * The ticket ID is in the input data; the URL uses the ticket-level PATCH endpoint.
 */
export function useUpdateTicketCompat(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, UpdateTicketInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, UpdateTicketInput>({
    mutationFn: ({ ticketId, ...data }) =>
      apiClient.patch<{ success: boolean }>(`/projects/tickets/${ticketId}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.ticket(variables.ticketId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    ...options,
  });
}

/** Backward-compat useDeleteTicket that doesn't require projectId as first arg. */
export function useDeleteTicketCompat(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { ticketId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { ticketId: number }>({
    mutationFn: ({ ticketId }) =>
      apiClient.delete<{ success: boolean }>(`/projects/tickets/${ticketId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    ...options,
  });
}

/** Add a comment to a ticket. */
export function useAddComment(
  options?: Omit<UseMutationOptions<{ id: number; content: string; createdAt: string }, Error, { ticketId: number; content: string }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; content: string; createdAt: string }, Error, { ticketId: number; content: string }>({
    mutationFn: ({ ticketId, content }) =>
      apiClient.post<{ id: number; content: string; createdAt: string }>(
        `/projects/tickets/${ticketId}/comments`,
        { content }
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
    ...options,
  });
}

/** Add a label to a ticket. */
export function useAddLabelToTicket(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { ticketId: number; labelId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { ticketId: number; labelId: number }>({
    mutationFn: ({ ticketId, labelId }) =>
      apiClient.post<{ success: boolean }>(`/projects/tickets/${ticketId}/labels`, { labelId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
    ...options,
  });
}

/** Remove a label from a ticket. */
export function useRemoveLabelFromTicket(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { ticketId: number; labelId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { ticketId: number; labelId: number }>({
    mutationFn: ({ ticketId, labelId }) =>
      apiClient.delete<{ success: boolean }>(
        `/projects/tickets/${ticketId}/labels/${labelId}`
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
    ...options,
  });
}

/** Fetch subtasks of a ticket. */
export function useSubtasks(
  ticketId: number,
  options?: Omit<UseQueryOptions<Ticket[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<Ticket[]>({
    queryKey: [...queryKeys.projects.all, "subtasks", { ticketId }],
    queryFn: () => apiClient.get<Ticket[]>(`/projects/tickets/${ticketId}/subtasks`),
    enabled: ticketId > 0,
    ...options,
  });
}

/** Reorder tickets within a project (drag-and-drop). Alias for useMoveTicket. */
export function useUpdateTicketOrder(options?: Parameters<typeof useMutation>[0]) {
  return useMoveTicket(options);
}

/**
 * Backward-compat useCreateLabel that creates an org-level label (no projectId).
 * The label can then be attached to any ticket in the org.
 */
export function useCreateOrgLabel(
  options?: Omit<UseMutationOptions<TicketLabel, Error, CreateLabelInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<TicketLabel, Error, CreateLabelInput>({
    mutationFn: (data) =>
      apiClient.post<TicketLabel>("/projects/labels", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.labels() });
    },
    ...options,
  });
}

type AddAttachmentInput = {
  ticketId: number;
  fileName: string;
  fileUrl: string;
  fileKey?: string;
  fileSize: number;
  mimeType: string;
};

/** Add a file attachment to a ticket. */
export function useAddAttachment(
  options?: Omit<UseMutationOptions<{ id: number }, Error, AddAttachmentInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number }, Error, AddAttachmentInput>({
    mutationFn: ({ ticketId, fileName, fileUrl, fileKey, fileSize, mimeType }) =>
      apiClient.post<{ id: number }>(`/projects/tickets/${ticketId}/attachments`, {
        fileName,
        fileUrl,
        fileKey,
        fileSize,
        mimeType,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
    ...options,
  });
}
