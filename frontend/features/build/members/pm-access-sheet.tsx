"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ShieldCheckIcon } from "@animateicons/react/lucide";
import { LoadingButton } from "@/components/ui/loading-button";
import { RoleAssignmentsSheet } from "@/components/rbac/role-assignments-sheet";
import { useRoles, useMaterializeRoleTemplate } from "@/hooks/api/roles";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Role } from "@/types/organization";

const PM_TEMPLATE_ID = "project_manager";
const PM_ROLE_SLUG = "PROJECT_MANAGER";
const PM_ROLE_NAME = "Project Manager";

function resolvePmRole(roles: Role[]): Role | undefined {
  return (
    roles.find((r) => r.slug === PM_ROLE_SLUG) ??
    roles.find((r) => r.name === PM_ROLE_NAME)
  );
}

function PmAccessTrigger({
  isPending,
  onClick,
}: {
  isPending: boolean;
  onClick: () => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  return (
    <LoadingButton
      variant="outline"
      size="sm"
      className="h-9 min-h-9 gap-1.5 text-xs"
      isPending={isPending}
      loadingText="Setting up…"
      onClick={onClick}
      {...hoverHandlers}
    >
      <ShieldCheckIcon ref={iconRef} size={14} />
      Project admins
    </LoadingButton>
  );
}

export function PmAccessButton() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<Role | null>(null);

  const rolesQuery = useRoles();
  const materializeTemplate = useMaterializeRoleTemplate();

  const existingRole =
    rolesQuery.data != null ? resolvePmRole(rolesQuery.data) : undefined;

  const handleClick = useCallback(() => {
    if (existingRole) {
      setPendingRole(existingRole);
      setSheetOpen(true);
      return;
    }

    materializeTemplate.mutate(
      { templateId: PM_TEMPLATE_ID },
      {
        onSuccess: (createdRole) => {
          setPendingRole(createdRole);
          setSheetOpen(true);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }, [existingRole, materializeTemplate]);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setPendingRole(null);
  }, []);

  const isPending = materializeTemplate.isPending || rolesQuery.isLoading;

  return (
    <>
      <PmAccessTrigger isPending={isPending} onClick={handleClick} />

      <RoleAssignmentsSheet
        role={pendingRole}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
      />
    </>
  );
}
