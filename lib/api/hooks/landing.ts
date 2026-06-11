"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface SubmitLandingInput {
  orgId: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  referrerUrl: string | null;
  cfTurnstileToken?: string;
}

interface SubmitLandingResponse {
  success?: boolean;
  id?: string;
}

export function useSubmitLandingForm() {
  return useMutation<SubmitLandingResponse, Error, SubmitLandingInput>({
    mutationFn: (input) => apiClient.post<SubmitLandingResponse>("/landing/submit", input),
  });
}
