"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export function usePersonalInfoMutation() {
  return useMutation({
    mutationKey: ["onboarding", "personal-info"],
    mutationFn: (formData: FormData) =>
      apiClient.upload<void>("/onboarding/personal-info", formData),
  });
}

export function useBankDetailsMutation() {
  return useMutation({
    mutationKey: ["onboarding", "bank-details"],
    mutationFn: (formData: FormData) =>
      apiClient.upload<void>("/onboarding/bank-details", formData),
  });
}

export function useDocumentUploadMutation() {
  return useMutation({
    mutationKey: ["onboarding", "documents"],
    mutationFn: (formData: FormData) =>
      apiClient.upload<void>("/onboarding/documents", formData),
  });
}

export function useSubmitOnboardingMutation() {
  return useMutation({
    mutationKey: ["onboarding", "submit"],
    mutationFn: () => apiClient.post<void>("/onboarding/submit"),
  });
}
