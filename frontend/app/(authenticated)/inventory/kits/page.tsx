"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Boxes } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useAssembleKit,
  useKitBom,
  useKitBuildable,
  type KitComponent,
} from "@/hooks/api/inventory/stock-types-dock";
import { useProductVariants } from "@/hooks/api/inventory/products";
import { KitBomEditorSheet } from "@/features/inventory/components/kits/kit-bom-editor-sheet";

function KitsContent() {
  const canRead = useCan("inventory:products:read");
  const canAssemble = useCan("inventory:kits:assemble");
  const canEditBom = useCan("inventory:products:update");
  const [editingBom, setEditingBom] = useState(false);

  const [kitInput, setKitInput] = useState("");
  const kitVariantId = Number(kitInput) > 0 ? Number(kitInput) : null;

  const bom = useKitBom(kitVariantId);
  const buildable = useKitBuildable(kitVariantId);
  const assemble = useAssembleKit();

  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState("");

  const components = useMemo(() => (Array.isArray(bom.data) ? bom.data : []), [bom.data]);

  /*
   * The BOM projection carries `componentVariantId` and nothing else, so this
   * table used to print "Variant #42" at a person and expect them to know what
   * that was (§5). The variant list is already in the cache — the component
   * picker in the editor reads the same query — so the name is resolved at the
   * display boundary rather than asked of the server again.
   */
  const { data: variants } = useProductVariants({ activeOnly: false });
  const variantNames = useMemo(() => {
    const byId = new Map<number, string>();
    for (const variant of variants ?? [])
      byId.set(variant.id, `${variant.productName} — ${variant.name}`);
    return byId;
  }, [variants]);

  const componentColumns: DataTableColumn<KitComponent>[] = useMemo(
    () => [
      {
        key: "component",
        header: "Component",
        cell: (row) => (
          <span className="text-sm">
            {variantNames.get(row.componentVariantId) ?? `Variant #${String(row.componentVariantId)}`}
          </span>
        ),
      },
      {
        key: "per",
        header: "Per kit",
        headerClassName: "text-right",
        className: "text-right font-mono tabular-nums",
        cell: (row) =>
          Number(row.quantityPer).toLocaleString(undefined, { maximumFractionDigits: 4 }),
      },
    ],
    [variantNames],
  );

  function handleEditBomOpen(): void {
    setEditingBom(true);
  }

  const handleRetry = useCallback(() => {
    void bom.refetch();
    void buildable.refetch();
  }, [bom, buildable]);

  const runBuild = useCallback(
    (disassemble: boolean) => {
      if (!kitVariantId) {
        toast.error("Enter a kit variant id");
        return;
      }
      const location = Number(locationId);
      if (!Number.isInteger(location) || location <= 0) {
        toast.error("Enter the location to build at");
        return;
      }
      if (!/^\d{1,14}(\.\d{1,4})?$/.test(quantity) || Number(quantity) <= 0) {
        toast.error("Enter how many kits");
        return;
      }
      assemble.mutate(
        { kitVariantId, locationId: location, quantity, disassemble },
        {
          onSuccess: (result) =>
            toast.success(
              `${disassemble ? "Broke" : "Built"} ${result.quantity} at cost ${result.totalCost}`,
            ),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [assemble, kitVariantId, locationId, quantity],
  );

  const handleAssemble = useCallback(() => runBuild(false), [runBuild]);
  const handleDisassemble = useCallback(() => runBuild(true), [runBuild]);

  if (!canRead) {
    return (
      <PageWrapper title="Kits">
        <NoPermissionState permission="inventory:products:read" className="flex-1" />
      </PageWrapper>
    );
  }

  if (kitVariantId && bom.isError) {
    return (
      <PageWrapper title="Kits">
        <ErrorState
          title="Failed to load this kit"
          description="An error occurred while fetching the bill of materials."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Kits"
      subtitle="What a kit is made of, and building one from its components"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-6">
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="kit-variant">Kit variant id</Label>
          <Input
            id="kit-variant"
            inputMode="numeric"
            value={kitInput}
            onChange={(e) => setKitInput(e.target.value)}
            placeholder="e.g. 42"
          />
        </div>

        {kitVariantId === null ? (
          <InventoryEmptyState
            illustration={<EmptyWarehouseIllustration />}
            title="Choose a kit"
            description="A kit is a SKU a customer can order that does not exist until somebody builds it. Enter its variant id to see what it is made of."
          />
        ) : bom.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <>
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">
                  Bill of materials
                </h2>
                {canEditBom ? (
                  <Button size="sm" variant="outline" onClick={handleEditBomOpen}>
                    {components.length > 0 ? "Edit components" : "Set components"}
                  </Button>
                ) : null}
              </div>
              {components.length > 0 ? (
                <>
                  <DataTable
                    data={components}
                    columns={componentColumns}
                    getRowKey={(row) => row.id}
                  pagination={{ pageSize: 25 }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {buildable.data
                      ? `${buildable.data.buildable} whole kit(s) could be built from what is on hand.`
                      : "Checking what could be built…"}
                  </p>
                </>
              ) : (
                <InventoryEmptyState
                  illustration={<EmptyWarehouseIllustration />}
                  title="This SKU has no bill of materials"
                  description={
                    canEditBom
                      ? "Without components it cannot be assembled. Say what it is made of to make it a kit."
                      : "Without components it cannot be assembled, and changing that needs permission to update products."
                  }
                  action={
                    canEditBom
                      ? { label: "Set components", onClick: handleEditBomOpen }
                      : undefined
                  }
                />
              )}
            </section>

            {canAssemble && components.length > 0 && (
              <section className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <h2 className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">
                  Build
                </h2>
                <p className="text-xs text-muted-foreground">
                  Assembling consumes the components and creates the kit at exactly what they
                  turned out to cost. Breaking one apart gives that cost back, apportioned by each
                  component&apos;s share of the build.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="kit-location">Location id</Label>
                    <Input
                      id="kit-location"
                      inputMode="numeric"
                      value={locationId}
                      onChange={(e) => setLocationId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="kit-quantity">Kits</Label>
                    <Input
                      id="kit-quantity"
                      inputMode="decimal"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <LoadingButton
                    size="sm"
                    onClick={handleAssemble}
                    isPending={assemble.isPending}
                    loadingText="Building…"
                  >
                    <Boxes className="h-3.5 w-3.5" />
                    Assemble
                  </LoadingButton>
                  <Button size="sm" variant="outline" onClick={handleDisassemble}>
                    Disassemble
                  </Button>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {kitVariantId !== null ? (
        <KitBomEditorSheet
          open={editingBom}
          onOpenChange={setEditingBom}
          kitVariantId={kitVariantId}
          components={components}
        />
      ) : null}
    </PageWrapper>
  );
}

export default function KitsPage() {
  return (
    <Suspense>
      <KitsContent />
    </Suspense>
  );
}
