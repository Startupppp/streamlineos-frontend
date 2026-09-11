"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface SignupData {
  firstName: string;
  lastName?: string;
  email: string;
  companyName: string;
  phone?: string;
  country?: string;
  plan?: string;
}

export function useSignup() {
  return useMutation({
    mutationKey: ["auth", "register"],
    mutationFn: (data: SignupData) =>
      apiClient.post<{ success: true }>("/auth/register", data),
  });
}
