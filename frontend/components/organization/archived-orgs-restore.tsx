"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Archive } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  useArchivedOrganizations,
  useRestoreOrg,
} from "@/hooks/api/organization";
import { clearBackendTokenCache } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

interface ArchivedOrgsRestoreProps {
  className?: string;
  variant?: "card" | "compact";
}

export function ArchivedOrgsRestore({
  className,
  variant = "card",
}: ArchivedOrgsRestoreProps) {
  const { update } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const archivedQuery = useArchivedOrganizations();
  const restoreMutation = useRestoreOrg();

  const handleRestore = useCallback(
    (orgId: string) => {
      restoreMutation.mutate(orgId, {
        onSuccess: async (data) => {
          toast.success("Organization restored");
          clearBackendTokenCache();
          await update({ orgId: data.orgId });
          queryClient.clear();
          router.replace("/dashboard");
          router.refresh();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [restoreMutation, update, queryClient, router],
  );

  const orgs = archivedQuery.data ?? [];
  if (archivedQuery.isLoading || orgs.length === 0) return null;

  if (variant === "compact") {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="my-1 h-px bg-border" role="separator" />
        <p className="px-2 py-1.5 text-micro font-semibold uppercase tracking-wider text-foreground/70">
          Archived
        </p>
        {orgs.map((org) => (
          <div
            key={org.id}
            className="flex items-center gap-2 rounded-md px-2 py-1.5"
          >
            <Archive className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
              {org.name}
            </span>
            <LoadingButton
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 px-2 text-xs"
              isPending={
                restoreMutation.isPending &&
                restoreMutation.variables === org.id
              }
              onClick={() => handleRestore(org.id)}
            >
              Restore
            </LoadingButton>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm",
        className,
      )}
    >
      <div className="mb-3 flex items-start gap-2">
        <Archive className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground">
            Restore an archived organization
          </p>
          <p className="text-xs text-muted-foreground">
            Members regain access after restore. You can also create a new
            organization below.
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {orgs.map((org) => (
          <li
            key={org.id}
            className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {org.name}
            </span>
            <LoadingButton
              variant="outline"
              size="sm"
              className="shrink-0"
              isPending={
                restoreMutation.isPending &&
                restoreMutation.variables === org.id
              }
              onClick={() => handleRestore(org.id)}
            >
              Restore
            </LoadingButton>
          </li>
        ))}
      </ul>
    </div>
  );
}
