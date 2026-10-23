"use client";

import type { ReactNode } from "react";
import { PageState } from "@/components/shared/page-state";
import {
  pageStateFromError,
  type PageStateResolution,
} from "@/lib/page-state/resolve-page-state";
import type { AccessState } from "@/lib/rbac/gate";
import { KbPageNotFound } from "./kb-page-not-found";

const VIEW_PERMISSION = "kb:pages:view" as const;

export function documentRecordResolution(input: {
  access: AccessState;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  hasRecord: boolean;
}): PageStateResolution {
  if (input.access === "loading" || input.isLoading) return { kind: "loading" };
  if (input.access === "denied") {
    return { kind: "denied", permission: VIEW_PERMISSION };
  }
  if (input.isError || !input.hasRecord) {
    const mapped = pageStateFromError(input.error);
    if (mapped?.kind === "denied") return { kind: "error", error: input.error };
    if (mapped) return mapped;
    return { kind: "error", error: input.error };
  }
  return { kind: "ready" };
}

export function DocumentRecordGate({
  resolution,
  loading,
  error,
  onRetry,
}: {
  resolution: PageStateResolution;
  loading: ReactNode;
  error: unknown;
  onRetry: () => void;
}) {
  const miss = <KbPageNotFound error={error} onRetry={onRetry} />;
  return (
    <PageState
      resolution={resolution}
      loading={loading}
      notFound={miss}
      views={{ error: miss }}
      onRetry={onRetry}
      className="min-h-full"
    >
      {null}
    </PageState>
  );
}
