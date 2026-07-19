"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type OnboardingFlowSession = {
  id: number;
  status: "not_started" | "in_progress" | "completed" | "skipped" | "abandoned";
  currentStep: string | null;
  completedSteps: string[];
};

export function useOnboardingSessionQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.onboardingFlow.session(),
    queryFn: () => apiClient.get<OnboardingFlowSession>("/onboarding/session"),
    staleTime: 30_000,
    retry: false,
    enabled,
  });
}

export function usePatchOnboardingSessionMutation() {
  return useMutation({
    mutationKey: ["onboarding", "session", "patch"],
    mutationFn: (payload: { currentStep?: string; completedSteps?: string[] }) =>
      apiClient.patch<OnboardingFlowSession>("/onboarding/session", payload),
    retry: false,
  });
}

export type ChecklistItemStatus = "todo" | "in_progress" | "done" | "skipped" | "blocked";

export type ModuleChecklistItem = {
  id: number;
  itemKey: string;
  title: string;
  description: string | null;
  actionHref: string | null;
  status: ChecklistItemStatus;
  required: boolean;
  sortOrder: number;
};

export type ModuleChecklist = {
  id: number;
  moduleKey: string;
  status: "not_started" | "in_progress" | "completed";
  progress: number;
  dismissedAt: string | null;
  completedAt: string | null;
  items: ModuleChecklistItem[];
};

export function useModuleChecklists(enabled = true) {
  return useQuery({
    queryKey: queryKeys.onboardingFlow.moduleChecklists(),
    queryFn: () => apiClient.get<ModuleChecklist[]>("/onboarding/module-checklists"),
    staleTime: 30_000,
    enabled,
  });
}

export function useModuleChecklist(moduleKey: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.onboardingFlow.moduleChecklist(moduleKey),
    queryFn: () => apiClient.get<ModuleChecklist>(`/onboarding/module-checklists/${moduleKey}`),
    staleTime: 30_000,
    enabled,
  });
}

function invalidateChecklist(queryClient: ReturnType<typeof useQueryClient>, moduleKey: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.onboardingFlow.moduleChecklists() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.onboardingFlow.moduleChecklist(moduleKey) });
}

export function useCompleteChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["onboarding", "module-checklists", "complete-item"],
    mutationFn: ({ moduleKey, itemKey }: { moduleKey: string; itemKey: string }) =>
      apiClient.post(`/onboarding/module-checklists/${moduleKey}/items/${itemKey}/complete`, {}),
    onSuccess: (_data, { moduleKey }) => invalidateChecklist(queryClient, moduleKey),
  });
}

export function useSkipChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["onboarding", "module-checklists", "skip-item"],
    mutationFn: ({ moduleKey, itemKey, reason }: { moduleKey: string; itemKey: string; reason?: string }) =>
      apiClient.post(`/onboarding/module-checklists/${moduleKey}/items/${itemKey}/skip`, { reason }),
    onSuccess: (_data, { moduleKey }) => invalidateChecklist(queryClient, moduleKey),
  });
}

export function useDismissModuleChecklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["onboarding", "module-checklists", "dismiss"],
    mutationFn: (moduleKey: string) =>
      apiClient.post(`/onboarding/module-checklists/${moduleKey}/dismiss`, {}),
    onSuccess: (_data, moduleKey) => invalidateChecklist(queryClient, moduleKey),
  });
}

export function useRestartModuleChecklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["onboarding", "module-checklists", "restart"],
    mutationFn: (moduleKey: string) =>
      apiClient.post(`/onboarding/module-checklists/${moduleKey}/restart`, {}),
    onSuccess: (_data, moduleKey) => invalidateChecklist(queryClient, moduleKey),
  });
}

export type GuidedTourProgress = {
  id: number;
  status: "not_started" | "in_progress" | "completed" | "dismissed";
  currentStep: number;
  completedAt: string | null;
  dismissedAt: string | null;
};

export type GuidedTour = {
  id: number;
  tourKey: string;
  moduleKey: string | null;
  steps: Record<string, unknown>[];
  progress: GuidedTourProgress | null;
};

export function useGuidedTours(enabled = true) {
  return useQuery({
    queryKey: queryKeys.onboardingFlow.tours(),
    queryFn: () => apiClient.get<GuidedTour[]>("/onboarding/tours"),
    staleTime: 30_000,
    enabled,
  });
}

export function useSaveTourProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["onboarding", "tours", "save-progress"],
    mutationFn: ({ tourKey, currentStep }: { tourKey: string; currentStep: number }) =>
      apiClient.post<GuidedTourProgress>(`/onboarding/tours/${tourKey}/progress`, { currentStep }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboardingFlow.tours() });
    },
  });
}

export function useCompleteTour() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["onboarding", "tours", "complete"],
    mutationFn: (tourKey: string) =>
      apiClient.post<GuidedTourProgress>(`/onboarding/tours/${tourKey}/complete`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboardingFlow.tours() });
    },
  });
}

export function useDismissTour() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["onboarding", "tours", "dismiss"],
    mutationFn: (tourKey: string) =>
      apiClient.post<GuidedTourProgress>(`/onboarding/tours/${tourKey}/dismiss`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboardingFlow.tours() });
    },
  });
}
