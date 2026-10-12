"use client";

import { useMutation } from "@tanstack/react-query";
import type {
  IntakeFormOutput,
  IntakeSubmitResponse,
} from "@/features/build/intake/public-intake-schema";
import { submitIntakeByToken } from "@/features/build/intake/public-intake-api";

export type { IntakeSubmitResponse };

export function useSubmitIntakeByToken(intakeToken: string) {
  return useMutation<IntakeSubmitResponse, Error, IntakeFormOutput>({
    mutationKey: ["projects", "intake", "t", intakeToken, "submit"],
    mutationFn: (body) => submitIntakeByToken(intakeToken, body),
  });
}
