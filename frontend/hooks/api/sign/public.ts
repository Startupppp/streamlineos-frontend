"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildUrl } from "@/lib/api-client";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import type { SignPublicSession } from "@/types/sign";
import { withCorrelation } from "@/lib/observability/with-correlation";

function unwrap<T>(body: unknown): T {
  if (body !== null && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (b.success === true && "data" in b) return b.data as T;
  }
  return body as T;
}

async function parseOrThrow<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    let message = fallback;
    try {
      const data = (await res.json()) as Record<string, unknown>;
      if (typeof data?.message === "string" && data.message) message = data.message;
      else if (Array.isArray(data?.message)) message = data.message.filter((m): m is string => typeof m === "string").join(", ");
    } catch {
    }
    throw new Error(message);
  }
  const body = (await res.json()) as unknown;
  return unwrap<T>(body);
}

async function publicGet<T>(path: string, fallback: string): Promise<T> {
  const res = await fetch(buildUrl(path), { headers: withCorrelation(new Headers()) });
  return parseOrThrow<T>(res, fallback);
}

async function publicPost<T>(path: string, body: unknown, fallback: string): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers: withCorrelation(new Headers({ "Content-Type": "application/json" })),
    body: JSON.stringify(body ?? {}),
  });
  return parseOrThrow<T>(res, fallback);
}

export function useSignPublicSession(token: string) {
  return useQuery({
    queryKey: growthAndSignQueryKeys.signPublic.session(token),
    queryFn: () => publicGet<SignPublicSession>(`/public/sign/${token}/session`, "This signing link is invalid."),
    staleTime: 5_000,
  });
}

export function useSignPublicDocumentPreview(token: string, documentId: number | undefined) {
  return useQuery({
    queryKey: [...growthAndSignQueryKeys.signPublic.session(token), "document", documentId] as const,
    queryFn: () => publicGet<{ url: string }>(`/public/sign/${token}/documents/${documentId}/preview`, "Unable to load document."),
    enabled: documentId !== undefined,
    staleTime: 60_000,
  });
}

function useInvalidateSession(token: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signPublic.session(token) });
}

export function useRequestSignOtp(token: string) {
  return useMutation({
    mutationKey: ["signPublic", "request-otp", token],
    mutationFn: () => publicPost<{ sent: boolean }>(`/public/sign/${token}/request-otp`, {}, "Unable to send code."),
  });
}

export function useAuthenticateSignSession(token: string) {
  const invalidate = useInvalidateSession(token);
  return useMutation({
    mutationKey: ["signPublic", "auth", token],
    mutationFn: (input: { accessCode?: string; otpCode?: string }) =>
      publicPost<{ authenticated: boolean }>(`/public/sign/${token}/auth`, input, "Authentication failed."),
    onSuccess: invalidate,
  });
}

export function useAcceptSignConsent(token: string) {
  const invalidate = useInvalidateSession(token);
  return useMutation({
    mutationKey: ["signPublic", "consent", token],
    mutationFn: (disclosureVersion: string) =>
      publicPost<{ accepted: boolean }>(`/public/sign/${token}/consent`, { disclosureVersion }, "Unable to record consent."),
    onSuccess: invalidate,
  });
}

export function useSetSignFieldValue(token: string) {
  const invalidate = useInvalidateSession(token);
  return useMutation({
    mutationKey: ["signPublic", "field-value", token],
    mutationFn: ({ fieldId, value }: { fieldId: number; value: string | boolean | null }) =>
      publicPost<{ success: true }>(`/public/sign/${token}/fields/${fieldId}`, { value }, "Unable to save this field."),
    onSuccess: invalidate,
  });
}

export function useAdoptSignSignature(token: string) {
  const invalidate = useInvalidateSession(token);
  return useMutation({
    mutationKey: ["signPublic", "adopt-signature", token],
    mutationFn: (input: {
      assetType: "signature" | "initials" | "stamp";
      method: "drawn" | "typed" | "uploaded" | "saved";
      imageDataUrl?: string;
      typedText?: string;
      typedFontStyle?: string;
    }) => publicPost(`/public/sign/${token}/adopt-signature`, input, "Unable to save your signature."),
    onSuccess: invalidate,
  });
}

export function useCompleteSignSession(token: string) {
  const invalidate = useInvalidateSession(token);
  return useMutation({
    mutationKey: ["signPublic", "complete", token],
    mutationFn: () => publicPost<{ completed: boolean; envelopeCompleted: boolean }>(`/public/sign/${token}/complete`, {}, "Unable to complete signing."),
    onSuccess: invalidate,
  });
}

export function useDeclineSignSession(token: string) {
  const invalidate = useInvalidateSession(token);
  return useMutation({
    mutationKey: ["signPublic", "decline", token],
    mutationFn: (reason: string) => publicPost<{ declined: boolean }>(`/public/sign/${token}/decline`, { reason }, "Unable to decline."),
    onSuccess: invalidate,
  });
}

