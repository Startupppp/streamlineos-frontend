"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AppSheet, ErrorState, NoPermissionState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useProductVariants } from "@/hooks/api/inventory/products";
import {
  CUSTOMER_RETURNS_PERMISSION,
  useApproveCustomerReturn,
  useCustomerReturn,
  usePostCustomerReturn,
} from "@/hooks/api/inventory/returns";
import { ReturnApproveDialog } from "./return-approve-dialog";
import { ReturnInspectLine } from "./return-inspect-line";
import { ReturnStatusBadge } from "./return-status-badge";

export interface CustomerReturnInspectSheetProps {
  returnId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * B9, item 4 — the inspect surface the API has had since INV-209 and the UI
 * never called.
 *
 * The whole workflow lives here because it is one walk: open the boxes, record
 * what you saw, sign it off, post it. Splitting the approval onto another screen
 * would mean the person who looked at the goods is not the person the button is
 * in front of.
 */
export function CustomerReturnInspectSheet({
  returnId,
  open,
  onOpenChange,
}: CustomerReturnInspectSheetProps) {
  const canManage = useCan(CUSTOMER_RETURNS_PERMISSION);
  const [approveOpen, setApproveOpen] = useState(false);

  const detail = useCustomerReturn(open ? returnId : null);
  const variantsQuery = useProductVariants({ activeOnly: false });
  const approve = useApproveCustomerReturn();
  const post = usePostCustomerReturn();

  const record = detail.data;
  const lines = record?.lines ?? [];
  const skuById = new Map((variantsQuery.data ?? []).map((v) => [v.id, v.sku]));
  const uninspected = lines.filter((line) => line.inspectedAt === null).length;

  function handleRetry(): void {
    void detail.refetch();
  }

  function handleOpenApprove(): void {
    setApproveOpen(true);
  }

  function handleApprove(creditReference: string | undefined): void {
    if (returnId === null) return;
    approve.mutate(
      { returnId, ...(creditReference !== undefined ? { creditReference } : {}) },
      {
        onSuccess: () => {
          toast.success("Return approved");
          setApproveOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handlePost(): void {
    if (returnId === null) return;
    post.mutate(
      { returnId },
      {
        onSuccess: () => {
          toast.success("Return posted");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleClose(): void {
    onOpenChange(false);
  }

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={record ? `Return ${record.returnNumber}` : "Return"}
        description="Record what you found in each box, then approve and post."
        footer={
          <div className="flex w-full items-center gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleClose}>
              Close
            </Button>
            {record?.status === "DRAFT" ? (
              <Button
                size="sm"
                className="flex-1"
                disabled={!canManage || uninspected > 0 || lines.length === 0}
                onClick={handleOpenApprove}
              >
                Approve
              </Button>
            ) : null}
            {record?.status === "APPROVED" ? (
              <LoadingButton
                size="sm"
                className="flex-1"
                disabled={!canManage}
                isPending={post.isPending}
                loadingText="Posting…"
                onClick={handlePost}
              >
                Post return
              </LoadingButton>
            ) : null}
          </div>
        }
      >
        <div className="flex flex-col gap-3 px-6 py-4">
          {!canManage ? (
            <NoPermissionState permission={CUSTOMER_RETURNS_PERMISSION} compact />
          ) : detail.isError ? (
            <ErrorState
              title="Couldn't load this return"
              description={getErrorMessage(detail.error)}
              onRetry={handleRetry}
            />
          ) : detail.isLoading || !record ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <ReturnStatusBadge status={record.status} />
                <span className="text-micro text-muted-foreground">
                  {uninspected === 0
                    ? "Every line has been inspected"
                    : `${uninspected} of ${lines.length} still to inspect`}
                </span>
              </div>

              {record.creditReference ? (
                <p className="text-micro text-muted-foreground">
                  Credit reference {record.creditReference}
                </p>
              ) : null}

              {lines.map((line) => (
                <ReturnInspectLine
                  key={line.id}
                  returnId={record.id}
                  line={line}
                  sku={skuById.get(line.productVariantId) ?? "Unknown item"}
                  editable={canManage && record.status === "DRAFT"}
                />
              ))}
            </>
          )}
        </div>
      </AppSheet>

      <ReturnApproveDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        returnNumber={record?.returnNumber ?? "return"}
        isSubmitting={approve.isPending}
        onApprove={handleApprove}
      />
    </>
  );
}
