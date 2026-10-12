"use client";

import { useCallback, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCan } from "@/hooks/api/access";
import {
  useManagedProductMembers,
  useRemoveManagedProductMember,
} from "@/hooks/api/build/managed-product-members";
import type { ManagedProductMember } from "@/hooks/api/build/managed-product-members";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { AddProductMemberDialog } from "./add-product-member-dialog";

interface ProductSettingsMembersSectionProps {
  managedProductId: number;
}

function memberDisplayName(m: ManagedProductMember): string {
  if (!m.member) return `Member #${m.organizationMembershipId}`;
  const { firstName, lastName, email } = m.member;
  if (firstName || lastName) return [firstName, lastName].filter(Boolean).join(" ");
  return email;
}

export function ProductSettingsMembersSection({
  managedProductId,
}: ProductSettingsMembersSectionProps) {
  const canUpdate = useCan("build:managed-products:update");
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ManagedProductMember | null>(null);

  const { data, isLoading } = useManagedProductMembers(managedProductId);
  const removeMember = useRemoveManagedProductMember(managedProductId);

  const handleRemoveRow = useCallback((m: ManagedProductMember) => setRemoveTarget(m), []);

  const handleRemoveDialogChange = useCallback(
    (open: boolean) => {
      if (!open) setRemoveTarget(null);
    },
    [],
  );

  function handleRemoveConfirm() {
    if (!removeTarget) return;
    removeMember.mutate(removeTarget.id, {
      onSuccess: () => {
        toast.success("Member removed.");
        setRemoveTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  return (
    <section aria-labelledby="members-section-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="members-section-heading" className="text-sm font-semibold text-foreground">
          Members
        </h2>
        {canUpdate ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddOpen(true)}
          >
            <UserPlus aria-hidden="true" />
            Add member
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-1" aria-label="Product members">
          {(data?.data ?? []).map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">
                  {memberDisplayName(m)}
                </span>
                <span className="text-xs capitalize text-muted-foreground">{m.role}</span>
              </div>
              {canUpdate ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="w-7 shrink-0"
                  aria-label={`Remove ${memberDisplayName(m)}`}
                  onClick={() => handleRemoveRow(m)}
                >
                  <X aria-hidden="true" size={14} />
                </Button>
              ) : null}
            </li>
          ))}
          {(data?.data ?? []).length === 0 && !isLoading ? (
            <li className="py-4 text-center text-sm text-muted-foreground">No members yet.</li>
          ) : null}
        </ul>
      )}

      {canUpdate ? (
        <AddProductMemberDialog
          managedProductId={managedProductId}
          open={addOpen}
          onOpenChange={setAddOpen}
        />
      ) : null}

      <ConfirmDialog
        open={canUpdate && !!removeTarget}
        onOpenChange={handleRemoveDialogChange}
        title="Remove this member?"
        description={
          removeTarget
            ? (data?.data ?? []).length === 1
              ? `${memberDisplayName(removeTarget)} will lose access. Removing the last member leaves this product with no dedicated team.`
              : `${memberDisplayName(removeTarget)} will lose access to this product.`
            : ""
        }
        confirmLabel="Remove"
        destructive
        onConfirm={handleRemoveConfirm}
      />
    </section>
  );
}
