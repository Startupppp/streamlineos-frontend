"use client";

import { useCallback, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TablePagination } from "@/components/ui/table-pagination";
import { useCan } from "@/hooks/api/access";
import {
  useManagedProductMembers,
  useRemoveManagedProductMember,
} from "@/hooks/api/build/managed-product-members";
import type { ManagedProductMember } from "@/hooks/api/build/managed-product-members";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-envelope";
import { toast } from "sonner";
import { AddProductMemberDialog } from "./add-product-member-dialog";
import { ErrorState } from "@/components/shared/error-state";
import {
  PRODUCT_MEMBER_CURSORS_PARAM,
  useBuildCursorPager,
} from "@/features/build/shared/use-build-cursor-pager";

interface ProductSettingsMembersSectionProps {
  managedProductId: number;
  canWrite?: boolean;
}

function memberDisplayName(m: ManagedProductMember): string {
  if (!m.member) return `Member #${m.organizationMembershipId}`;
  const { firstName, lastName, email } = m.member;
  if (firstName || lastName) return [firstName, lastName].filter(Boolean).join(" ");
  return email;
}

export function ProductSettingsMembersSection({
  managedProductId,
  canWrite: canWriteProp,
}: ProductSettingsMembersSectionProps) {
  const canUpdateByPermission = useCan("build:managed-products:update");
  const canUpdate = canWriteProp !== undefined ? canWriteProp : canUpdateByPermission;
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ManagedProductMember | null>(null);
  const [removeBlockedMsg, setRemoveBlockedMsg] = useState<string | null>(null);
  const pager = useBuildCursorPager(
    String(managedProductId),
    PRODUCT_MEMBER_CURSORS_PARAM,
  );

  const { data, isLoading, isError, error, refetch } = useManagedProductMembers(
    managedProductId,
    { cursor: pager.cursor },
  );
  const removeMember = useRemoveManagedProductMember(managedProductId);

  const handleRemoveRow = useCallback((m: ManagedProductMember) => {
    setRemoveBlockedMsg(null);
    setRemoveTarget(m);
  }, []);

  const handleRemoveDialogChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setRemoveTarget(null);
        setRemoveBlockedMsg(null);
      }
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
      onError: (e) => {
        if (isApiError(e) && e.status === 409) {
          setRemoveBlockedMsg("Cannot remove the last admin of a product.");
        } else {
          toast.error(getErrorMessage(e));
        }
      },
    });
  }

  const handleNextPage = useCallback(() => {
    pager.goNext(data?.pagination?.nextCursor);
  }, [pager, data?.pagination?.nextCursor]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const members = data?.data ?? [];
  const hasMore = data?.pagination?.hasMore ?? false;

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
      ) : isError ? (
        <ErrorState
          compact
          title="Could not load product members"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
          error={error}
        />
      ) : (
        <ul className="flex flex-col gap-1" aria-label="Product members">
          {members.map((m) => (
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
          {members.length === 0 && !isLoading ? (
            <li className="py-4 text-center text-sm text-muted-foreground">No members yet.</li>
          ) : null}
        </ul>
      )}

      {!isError && (members.length > 0 || pager.hasPrevious) ? (
        <TablePagination
          mode="cursor"
          rowCount={members.length}
          pageNumber={pager.pageNumber}
          hasMore={hasMore}
          hasPrevious={pager.hasPrevious}
          onNext={handleNextPage}
          onPrevious={pager.goPrevious}
          hideOnSinglePage
        />
      ) : null}

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
          removeBlockedMsg
            ? removeBlockedMsg
            : removeTarget
              ? `${memberDisplayName(removeTarget)} will lose access to this product.`
              : ""
        }
        confirmLabel="Remove"
        destructive
        onConfirm={handleRemoveConfirm}
      />
    </section>
  );
}
