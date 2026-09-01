"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface SignupData {
  email: string;
  password: string;
  fullName: string;
  orgName: string;
}

export function useSignup() {
  return useMutation({
    mutationFn: (data: SignupData) =>
      apiClient.post<{ success: boolean }>("/auth/register", data),
  });
}
