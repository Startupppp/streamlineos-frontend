"use client";

import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { useProjectLinkedProducts } from "@/hooks/api/build/managed-product-projects";
import { useLinkProjectSecondary } from "@/hooks/api/build/use-link-project-managed-product";
import { useManagedProduct } from "@/hooks/api/build/managed-products";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { CheckCircle2, Circle } from "lucide-react";
import { useCallback } from "react";

interface ProjectLinkPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  managedProductId: number;
  projectId: number;
  projectName: string;
  onLinked: () => void;
}

export function ProjectLinkPreviewSheet({
  open,
  onOpenChange,
  managedProductId,
  projectId,
  projectName,
  onLinked,
}: ProjectLinkPreviewSheetProps) {
  const { data: productData } = useManagedProduct(managedProductId);
  const managedProductName = productData?.name ?? "this product";
  const { data } = useProjectLinkedProducts(projectId, { enabled: open });
  const mutation = useLinkProjectSecondary();

  const currentLinks = data?.data ?? [];
  const currentPrimary = currentLinks.find((l) => l.isPrimary);
  const alreadyLinked = currentLinks.some((l) => l.managedProductId === managedProductId);
  const willBePrimary = currentLinks.length === 0;

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleConfirm = useCallback(() => {
    mutation.mutate(
      { managedProductId, projectId },
      {
        onSuccess: () => {
          toast.success(`${projectName} linked to ${managedProductName}`);
          onLinked();
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [mutation, managedProductId, projectId, projectName, managedProductName, onLinked, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Link project to product</SheetTitle>
          <SheetDescription>
            Review what will change for <strong>{projectName}</strong> after linking.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-4">
          {alreadyLinked ? (
            <p className="text-sm text-muted-foreground">
              This project is already linked to <strong>{managedProductName}</strong>.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Current product links</p>
                {currentLinks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No product links yet.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {currentLinks.map((link) => (
                      <li key={link.managedProductId} className="flex items-center gap-2 text-sm">
                        {link.isPrimary ? (
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" aria-label="Primary" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground shrink-0" aria-label="Secondary" />
                        )}
                        <span>{link.name}</span>
                        {link.isPrimary && (
                          <Badge variant="secondary" className="text-xs">primary</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-md border border-border bg-muted/40 p-3 flex flex-col gap-1">
                <p className="text-sm font-medium">After linking</p>
                <p className="text-sm text-muted-foreground">
                  {willBePrimary
                    ? `${managedProductName} will become the primary product for ${projectName}.`
                    : currentPrimary
                      ? `${managedProductName} will be added as a secondary link. ${currentPrimary.name} remains the primary product.`
                      : `${managedProductName} will be added as a secondary link.`}
                </p>
              </div>
            </>
          )}
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <LoadingButton
            type="button"
            disabled={alreadyLinked}
            isPending={mutation.isPending}
            onClick={handleConfirm}
          >
            Link project
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
