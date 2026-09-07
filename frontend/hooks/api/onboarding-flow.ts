"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const onboardingSessionContract = lazyContract(() =>
  import("@/hooks/api/onboarding-flow-schema").then((m) => m.onboardingFlowSessionContract),
);
const moduleChecklistListContract = lazyContract(() =>
  import("@/hooks/api/onboarding-flow-schema").then((m) => m.moduleChecklistListContract),
);
const checklistProgressContract = lazyContract(() =>
  import("@/hooks/api/onboarding-flow-schema").then((m) => m.checklistProgressContract),
);
const guidedTourListContract = lazyContract(() =>
  import("@/hooks/api/onboarding-flow-schema").then((m) => m.guidedTourListContract),
);
const tourProgressRowContract = lazyContract(() =>
  import("@/hooks/api/onboarding-flow-schema").then((m) => m.tourProgressRowContract),
);

export type OnboardingFlowSession = {
  id: number;
  status: "not_started" | "in_progress" | "completed" | "skipped" | "abandoned";
  currentStep: string | null;
  completedSteps: string[];
  data: Record<string, unknown>;
};

export type OnboardingSessionPatch = {
  currentStep?: string;
  completedSteps?: string[];
  data?: Record<string, unknown>;
};

export function useOnboardingSessionQuery(enabled = true) {
  return useQuery({
    queryKey: platformCoreQueryKeys.onboardingFlow.session(),
    queryFn: ({ signal }) => apiClient.get<OnboardingFlowSession>("/onboarding/session", undefined, signal, onboardingSessionContract),
    staleTime: 30_000,
    retry: false,
    enabled,
  });
}

export function usePatchOnboardingSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["onboarding", "session", "patch"],
    mutationFn: (payload: OnboardingSessionPatch) =>
      apiClient.patch<OnboardingFlowSession>("/onboarding/session", payload, undefined, onboardingSessionContract),
    retry: false,
    onSuccess: (session) => {
      queryClient.setQueryData(platformCoreQueryKeys.onboardingFlow.session(), session);
    },
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
  return useGatedQuery("onboarding:module-checklists:view", {
    queryKey: platformCoreQueryKeys.onboardingFlow.moduleChecklists(),
    queryFn: ({ signal }) => apiClient.get<ModuleChecklist[]>("/onboarding/module-checklists", undefined, signal, moduleChecklistListContract),
    staleTime: 30_000,
    enabled,
  });
}

function invalidateChecklist(queryClient: ReturnType<typeof useQueryClient>, moduleKey: string) {
  void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.onboardingFlow.moduleChecklists() });
  void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.onboardingFlow.moduleChecklist(moduleKey) });
}

export function useCompleteChecklistItem() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("onboarding:module-checklists:manage", {
    mutationKey: ["onboarding", "module-checklists", "complete-item"],
    mutationFn: ({ moduleKey, itemKey }: { moduleKey: string; itemKey: string }) =>
      apiClient.post(`/onboarding/module-checklists/${moduleKey}/items/${itemKey}/complete`, {}, undefined, checklistProgressContract),
    onSuccess: (_, { moduleKey }) => invalidateChecklist(queryClient, moduleKey),
  });
}

export function useDismissModuleChecklist() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("onboarding:module-checklists:manage", {
    mutationKey: ["onboarding", "module-checklists", "dismiss"],
    mutationFn: (moduleKey: string) =>
      apiClient.post(`/onboarding/module-checklists/${moduleKey}/dismiss`, {}, undefined, checklistProgressContract),
    onSuccess: (_, moduleKey) => invalidateChecklist(queryClient, moduleKey),
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
  return useGatedQuery("onboarding:tours:view", {
    queryKey: platformCoreQueryKeys.onboardingFlow.tours(),
    queryFn: ({ signal }) => apiClient.get<GuidedTour[]>("/onboarding/tours", undefined, signal, guidedTourListContract),
    staleTime: 30_000,
    enabled,
  });
}

export function useSaveTourProgress() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("onboarding:tours:view", {
    mutationKey: ["onboarding", "tours", "save-progress"],
    mutationFn: ({ tourKey, currentStep }: { tourKey: string; currentStep: number }) =>
      apiClient.post<GuidedTourProgress>(`/onboarding/tours/${tourKey}/progress`, { currentStep }, undefined, tourProgressRowContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.onboardingFlow.tours() });
    },
  });
}

export function useDismissTour() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("onboarding:tours:view", {
    mutationKey: ["onboarding", "tours", "dismiss"],
    mutationFn: (tourKey: string) =>
      apiClient.post<GuidedTourProgress>(`/onboarding/tours/${tourKey}/dismiss`, {}, undefined, tourProgressRowContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.onboardingFlow.tours() });
    },
  });
}
