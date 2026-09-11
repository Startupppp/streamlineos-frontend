"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildUrl } from "@/lib/api-client";
import { isRecord } from "@/lib/is-record";
import {
  lazyContract,
  parseApiResponse,
  resolveContract,
  type ContractSource,
} from "@/lib/api-envelope";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import type { SignPublicSession } from "@/types/sign";
import { withCorrelation } from "@/lib/observability/with-correlation";

const signPublicSessionContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signPublicSessionContract),
);
const signPublicDocumentPreviewContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signPublicDocumentPreviewContract),
);

function unwrap<T>(body: unknown): T {
  if (isRecord(body) && body.success === true && "data" in body) return body.data as T;
  return body as T;
}

async function parseOrThrow<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    let message = fallback;
    try {
      const data: unknown = await res.json();
      if (isRecord(data)) {
        if (typeof data.message === "string" && data.message) message = data.message;
        else if (Array.isArray(data.message)) {
          const parts: unknown[] = data.message;
          message = parts.filter((m): m is string => typeof m === "string").join(", ");
        }
      }
    } catch {
    }
    throw new Error(message);
  }
  const body: unknown = await res.json();
  return unwrap<T>(body);
}

/**
 * `parseOrThrow` always throws on a failed response, so it keeps owning the
 * error copy while the success path goes through the shared seam and its
 * contract.
 */
async function publicGet<T>(
  path: string,
  fallback: string,
  contract?: ContractSource<T>,
): Promise<T> {
  const pending = resolveContract(contract);
  const res = await fetch(buildUrl(path), { headers: withCorrelation(new Headers()) });
  if (!res.ok) return parseOrThrow<T>(res, fallback);
  return parseApiResponse<T>(res, await pending, path);
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
    queryFn: () =>
      publicGet<SignPublicSession>(
        `/public/sign/${token}/session`,
        "This signing link is invalid.",
        signPublicSessionContract,
      ),
    staleTime: 5_000,
  });
}

export function useSignPublicDocumentPreview(token: string, documentId: number | undefined) {
  return useQuery({
    queryKey: [...growthAndSignQueryKeys.signPublic.session(token), "document", documentId] as const,
    queryFn: () =>
      publicGet<{ url: string }>(
        `/public/sign/${token}/documents/${documentId}/preview`,
        "Unable to load document.",
        signPublicDocumentPreviewContract,
      ),
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
    mutationFn: () =>
      publicPost<{ sent: boolean; via?: "email" | "sms" }>(`/public/sign/${token}/request-otp`, {}, "Unable to send code."),
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

