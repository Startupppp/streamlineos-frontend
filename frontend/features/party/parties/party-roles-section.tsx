"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AppDialog } from "@/components/shared/app-dialog";
import { RecordForm, type RecordFormValues } from "@/components/renderer";
import { PARTY_ROLE_LAYOUT } from "@/lib/renderer/party-contact-layout";
import { useCan } from "@/hooks/api/access";
import { useChangePartyRole, usePartyRoles } from "@/hooks/api/party/party-roles";
import { getErrorMessage } from "@/lib/get-error-message";

interface PartyRolesSectionProps {
  partyId: string;
}

/** The roles a party holds (`/party/parties/:id/roles`), added and removed in place. */
export function PartyRolesSection({ partyId }: PartyRolesSectionProps) {
  const canManage = useCan("party:roles:manage");
  const roles = usePartyRoles(partyId);
  const change = useChangePartyRole(partyId);
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  function handleOpenAdd() {
    setAddOpen(true);
  }
  function handleCloseAdd() {
    setAddOpen(false);
  }
  function handleAdd(values: RecordFormValues) {
    const role = (values.role ?? "").trim();
    if (!role) return;
    change.mutate(
      { role },
      {
        onSuccess: () => {
          toast.success(`Role ${role} added`);
          setAddOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }
  function handleRequestRemove(event: React.MouseEvent<HTMLButtonElement>) {
    setRemoving(event.currentTarget.dataset.role ?? null);
  }
  function handleRemoveOpenChange(open: boolean) {
    if (!open) setRemoving(null);
  }
  function handleConfirmRemove() {
    if (!removing) return;
    change.mutate(
      { role: removing, remove: true },
      {
        onSuccess: () => {
          toast.success(`Role ${removing} removed`);
          setRemoving(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  if (roles.access.denied) return null;
  const list = roles.data?.roles ?? [];

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-label font-medium text-muted-foreground">Roles</h2>
        {canManage ? (
          <Button type="button" variant="ghost" size="sm" className="px-2 text-xs" onClick={handleOpenAdd}>
            Add role
          </Button>
        ) : null}
      </div>
      {roles.isLoading ? (
        <Skeleton className="h-6 w-40" />
      ) : roles.isError ? (
        <p className="text-sm text-muted-foreground">{getErrorMessage(roles.error)}</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No roles yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {list.map((role) => (
            <Badge key={role} variant="outline" className="h-6 gap-1 px-2 text-xs">
              {role}
              {canManage ? (
                <button
                  type="button"
                  data-role={role}
                  onClick={handleRequestRemove}
                  aria-label={`Remove role ${role}`}
                  className="rounded-sm text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </Badge>
          ))}
        </div>
      )}

      {canManage ? (
        <AppDialog open={addOpen} onOpenChange={setAddOpen} title="Add a role">
          <RecordForm
            key={String(addOpen)}
            layout={PARTY_ROLE_LAYOUT}
            mode="create"
            onSubmit={handleAdd}
            onCancel={handleCloseAdd}
            isSubmitting={change.isPending}
            submitLabel="Add role"
          />
        </AppDialog>
      ) : null}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={handleRemoveOpenChange}
        title={`Remove the ${removing ?? ""} role?`}
        description="The party stops appearing in lists filtered by this role."
        confirmLabel="Remove role"
        destructive
        isPending={change.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirmRemove}
      />
    </section>
  );
}
