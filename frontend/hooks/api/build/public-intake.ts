"use client";

import { useMutation } from "@tanstack/react-query";
import type {
  IntakeFormOutput,
  IntakeSubmitResponse,
} from "@/features/build/intake/public-intake-schema";
import { submitIntake } from "@/features/build/intake/public-intake-api";

export type { IntakeSubmitResponse };

export function useSubmitIntake(projectId: string) {
  return useMutation<IntakeSubmitResponse, Error, IntakeFormOutput>({
    mutationKey: ["projects", "intake", projectId, "submit"],
    mutationFn: (body) => submitIntake(projectId, body),
  });
}
