"use client";

import { useCallback } from "react";
import { LogOut } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useAccess } from "@/hooks/api/access";
import { useLeaveOrg } from "@/hooks/api/organization";
import { clearBackendTokenCache } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

interface LeaveOrganizationMenuItemProps {
  layout: "dropdown" | "drawer";
  onRequestLeave: () => void;
  canLeave: boolean;
  className?: string;
}

export function LeaveOrganizationMenuItem({
  layout,
  onRequestLeave,
  canLeave,
  className,
}: LeaveOrganizationMenuItemProps) {
  if (!canLeave) return null;

  if (layout === "dropdown") {
    return (
      <DropdownMenuItem
        className={cn(
          "gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10",
          className,
        )}
        onSelect={(event) => {
          event.preventDefault();
          onRequestLeave();
        }}
      >
        <LogOut className="h-3.5 w-3.5 shrink-0" />
        <span className="text-sm">Leave organization</span>
      </DropdownMenuItem>
    );
  }

  return (
    <button
      type="button"
      onClick={onRequestLeave}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors",
        className,
      )}
    >
      <LogOut className="h-3.5 w-3.5 shrink-0" />
      <span>Leave organization</span>
    </button>
  );
}

interface LeaveOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeaveOrganizationDialog({
  open,
  onOpenChange,
}: LeaveOrganizationDialogProps) {
  const { data: access } = useAccess();
  const { update } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const leaveMutation = useLeaveOrg();

  const handleConfirmLeave = useCallback(() => {
    leaveMutation.mutate(undefined, {
      onSuccess: async (data) => {
        toast.success("You have left the organization");
        onOpenChange(false);
        clearBackendTokenCache();
        await update(
          data.nextOrgId ? { orgId: data.nextOrgId } : { orgId: null },
        );
        queryClient.clear();
        if (data.nextOrgId) {
          router.replace("/dashboard");
        } else {
          router.replace("/org-setup");
        }
        router.refresh();
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [leaveMutation, onOpenChange, update, queryClient, router]);

  if (access?.isOrgOwner !== false) return null;

  return (
    <ConfirmDialog
      destructive
      open={open}
      title="Leave Organization"
      onOpenChange={onOpenChange}
      onConfirm={handleConfirmLeave}
      isPending={leaveMutation.isPending}
      confirmLabel="Leave Organization"
      description="Are you sure you want to leave this organization? You will lose access immediately and need a new invitation to rejoin."
    />
  );
}
