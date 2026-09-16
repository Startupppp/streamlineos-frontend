"use client";

import type { ReactNode } from "react";
import { PageState } from "@/components/shared/page-state";
import { LoadingState } from "@/components/shared/loading-state";
import { usePageState } from "@/hooks/api/use-page-state";

interface RequireModuleProps {
  module: string;
  children: ReactNode;
}

export function RequireModule({ module, children }: RequireModuleProps) {
  const state = usePageState({ module, isLoading: false, isError: false });

  return (
    <PageState resolution={state} loading={<LoadingState variant="page" />} className="flex-1">
      {children}
    </PageState>
  );
}
