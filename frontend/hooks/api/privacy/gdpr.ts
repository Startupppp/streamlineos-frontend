"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, newIdempotencyKey } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { downloadBlob } from "@/lib/download-blob";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  GdprErasureResult,
  GdprExportJob,
  GdprExportResult,
  GdprRectificationResult,
} from "@/hooks/api/privacy/gdpr-schema";

const keys = platformCoreQueryKeys.privacy;
const ADMIN_KEY = "hr:retention:manage";

const exportResultC = lazyContract(() => import("@/hooks/api/privacy/gdpr-schema").then((m) => m.gdprExportResultContract));
const exportJobC = lazyContract(() => import("@/hooks/api/privacy/gdpr-schema").then((m) => m.gdprExportJobContract));
const rectifyC = lazyContract(() => import("@/hooks/api/privacy/gdpr-schema").then((m) => m.gdprRectificationContract));
const erasureC = lazyContract(() => import("@/hooks/api/privacy/gdpr-schema").then((m) => m.gdprErasureContract));

/** A job still being worked by `GDPR_EXPORT_WORKER_ENABLED` workers; anything else is terminal. */
export function isExportJobActive(job: Pick<GdprExportJob, "status"> | undefined): boolean {
  return job?.status === "pending" || job?.status === "running";
}

function saveExportJson(result: GdprExportResult): GdprExportResult {
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
  downloadBlob(blob, `personal-data-${result.subject.userId}-${result.exportedAt.slice(0, 10)}.json`);
  return result;
}

/** Self-service, universal: the JWT subject is the data subject. Saves the JSON as a file. */
export function useExportMyData() {
  return useMutation<GdprExportResult, Error, void>({
    mutationKey: ["privacy", "gdpr", "export-me"],
    mutationFn: async () =>
      saveExportJson(await apiClient.post<GdprExportResult>("/gdpr/export/me", {}, undefined, exportResultC)),
  });
}

/**
 * Starts (or, under the same key, re-reads) an async archive. The key is per intent, so a
 * second click after success starts a new archive, never a duplicate of a pending one.
 */
export function useCreateMyExportJob() {
  const qc = useQueryClient();
  return useMutation<GdprExportJob, Error, void>({
    mutationKey: ["privacy", "gdpr", "export-async-me"],
    mutationFn: () =>
      apiClient.post<GdprExportJob>("/gdpr/export-async/me", { idempotencyKey: newIdempotencyKey() }, undefined, exportJobC),
    onSuccess: (job) => qc.setQueryData(keys.gdprExportJob(job.id), job),
  });
}

/** Polls every 5s while the worker has the job; stops on a terminal status. */
export function useGdprExportJob(jobId: string | null) {
  return useQuery<GdprExportJob, Error>({
    queryKey: keys.gdprExportJob(jobId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get<GdprExportJob>(`/gdpr/export-async/${jobId}/status`, undefined, signal, exportJobC),
    enabled: jobId !== null,
    staleTime: 0,
    refetchInterval: (query) => (isExportJobActive(query.state.data) ? 5_000 : false),
  });
}

export function useDownloadGdprExport() {
  return useMutation<void, Error, GdprExportJob>({
    mutationKey: ["privacy", "gdpr", "export-download"],
    mutationFn: async (job) => {
      const blob = await apiClient.download(`/gdpr/export-async/${job.id}/download`);
      if (blob.size === 0) throw new Error("The archive came back empty. Nothing was saved.");
      downloadBlob(blob, job.fileName ?? `personal-data-${job.id}.json`);
    },
  });
}

/** The string-valued fields of `gdprRectificationBodySchema`. */
export type StringRectifiableField =
  | "profile.name"
  | "hr_profile.personal_email"
  | "hr_profile.phone"
  | "hr_profile.date_of_birth"
  | "hr_profile.gender"
  | "hr_profile.preferred_name";

export type RectifiableField = StringRectifiableField | "hr_profile.address" | "hr_profile.emergency_contact";

/** `addressValueSchema`: the whole address, replacing the one on file. */
export interface RectificationAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

/** `emergencyContactValueSchema`: the whole contact, replacing the one on file. */
export interface RectificationEmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
  email?: string;
}

export type RectificationInput =
  | { field: StringRectifiableField; value: string }
  | { field: "hr_profile.address"; value: RectificationAddress }
  | { field: "hr_profile.emergency_contact"; value: RectificationEmergencyContact };

export function useRectifyMyProfile() {
  return useMutation<GdprRectificationResult, Error, RectificationInput>({
    mutationKey: ["privacy", "gdpr", "rectify-me"],
    mutationFn: (body) => apiClient.post<GdprRectificationResult>("/gdpr/rectification/me", body, undefined, rectifyC),
  });
}

export function useExportPersonData() {
  return useAuthorizedMutation<GdprExportResult, Error, { personId: string; reason?: string }>(ADMIN_KEY, {
    mutationKey: ["privacy", "gdpr", "export-person"],
    mutationFn: async ({ personId, reason }) =>
      saveExportJson(
        await apiClient.post<GdprExportResult>(
          `/gdpr/export/${encodeURIComponent(personId)}`,
          reason ? { reason } : {},
          undefined,
          exportResultC,
        ),
      ),
  });
}

export function useCreatePersonExportJob() {
  const qc = useQueryClient();
  return useAuthorizedMutation<GdprExportJob, Error, { personId: string }>(ADMIN_KEY, {
    mutationKey: ["privacy", "gdpr", "export-async-person"],
    mutationFn: ({ personId }) =>
      apiClient.post<GdprExportJob>(
        `/gdpr/export-async/${encodeURIComponent(personId)}`,
        { idempotencyKey: newIdempotencyKey() },
        undefined,
        exportJobC,
      ),
    onSuccess: (job) => qc.setQueryData(keys.gdprExportJob(job.id), job),
  });
}

export function useEraseSubject() {
  return useAuthorizedMutation<GdprErasureResult, Error, { subjectId: string; reason: string; dryRun: boolean }>(ADMIN_KEY, {
    mutationKey: ["privacy", "gdpr", "erasure"],
    mutationFn: ({ subjectId, reason, dryRun }) =>
      apiClient.post<GdprErasureResult>(`/gdpr/erasure/${encodeURIComponent(subjectId)}`, { reason, dryRun }, undefined, erasureC),
  });
}
