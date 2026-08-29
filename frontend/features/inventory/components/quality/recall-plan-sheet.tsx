"use client";

import { useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { TriangleAlertIcon } from "lucide-react";
import { AppSheet, NoPermissionState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isApiError } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { useCan } from "@/hooks/api/access";
import { useProductVariants } from "@/hooks/api/inventory/products";
import { useVendors } from "@/hooks/api/inventory/vendors";
import {
  useCreateRecall,
  useSimulateRecall,
  type RecallImpact,
} from "@/hooks/api/inventory/quality";
import { RecallImpactPanel } from "./recall-impact-panel";
import { RecallLotPicker } from "./recall-lot-picker";
import {
  asRecallMode,
  RECALL_MODES,
  recallPlanSchema,
  toSelection,
  type RecallMode,
  type RecallPlanFormValues,
} from "./recall-plan-schema";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Step = "select" | "review";

const MODE_LABEL: Record<RecallMode, string> = {
  lots: "Specific lots",
  product: "A product",
  vendor: "A supplier",
};

/**
 * D4 — plan a recall, then execute it.
 *
 * Three acts in one sheet, and the order is the point. Say what the recall is
 * about; see what it would do; then, and only then, do it. The screen this
 * replaces skipped the middle act entirely — an operator typed comma-separated
 * lot ids into a text field and pressed "Create Recall", and the first time
 * anybody learned that 31 customers already had the goods was after the holds
 * had been placed.
 *
 * The evidence version returned by the simulate is carried into the execute, so
 * the server can refuse if the warehouse has moved underneath the picture on
 * screen. When it does, the sheet re-simulates rather than asking the operator
 * to work out what changed.
 */
export function RecallPlanSheet({ open, onOpenChange }: Props) {
  const canRecall = useCan("inventory:quality:recall");
  const canRead = useCan("inventory:quality:read");

  const [step, setStep] = useState<Step>("select");
  const [impact, setImpact] = useState<RecallImpact | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [titleError, setTitleError] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  /**
   * Minted once per planned recall and held across retries. A key minted per
   * attempt is not an idempotency key at all — the retry after a timeout would
   * raise a second recall against the same lots.
   */
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());

  const simulateMut = useSimulateRecall();
  const createMut = useCreateRecall();

  const form = useForm<RecallPlanFormValues>({
    resolver: zodResolver(recallPlanSchema),
    defaultValues: {
      mode: "lots",
      lotIds: [],
      productVariantId: "",
      vendorId: "",
      manufacturedFrom: "",
      manufacturedTo: "",
    },
  });

  const mode = form.watch("mode");
  const lotIds = form.watch("lotIds");

  const variantsQuery = useProductVariants({ activeOnly: true });
  const vendorsQuery = useVendors({ isActive: true, limit: 100 });

  const variantOptions = (variantsQuery.data ?? []).map((v) => ({
    value: String(v.id),
    label: `${v.productName} · ${v.sku}`,
  }));
  const vendorOptions = (vendorsQuery.data?.items ?? []).map((v) => ({
    value: String(v.id),
    label: v.name,
  }));

  function reset(): void {
    setStep("select");
    setImpact(null);
    setTitle("");
    setDescription("");
    setTitleError(false);
    setIdempotencyKey(crypto.randomUUID());
    form.reset();
    simulateMut.reset();
    createMut.reset();
  }

  function handleOpenChange(next: boolean): void {
    if (!next) reset();
    onOpenChange(next);
  }

  function runSimulation(values: RecallPlanFormValues): void {
    simulateMut.mutate(toSelection(values), {
      onSuccess: handleSimulated,
      onError: handleSimulateError,
    });
  }

  function handleSimulated(result: RecallImpact): void {
    setImpact(result);
    setStep("review");
  }

  function handleSimulateError(error: Error): void {
    toast.error(getErrorMessage(error));
  }

  function handleSimulate(values: RecallPlanFormValues): void {
    runSimulation(values);
  }

  function handleBack(): void {
    setStep("select");
  }

  function handleLotsChange(next: number[]): void {
    form.setValue("lotIds", next, { shouldValidate: true });
  }

  function handleVariantChange(next: string): void {
    form.setValue("productVariantId", next, { shouldValidate: true });
  }

  function handleVendorChange(next: string): void {
    form.setValue("vendorId", next, { shouldValidate: true });
  }

  function handleManufacturedFromChange(next: string): void {
    form.setValue("manufacturedFrom", next, { shouldValidate: true });
  }

  function handleManufacturedToChange(next: string): void {
    form.setValue("manufacturedTo", next, { shouldValidate: true });
  }

  function handleCancel(): void {
    handleOpenChange(false);
  }

  function handleSubmitSimulate(): void {
    void form.handleSubmit(handleSimulate)();
  }

  function handleModeChange(next: string): void {
    form.setValue("mode", asRecallMode(next), { shouldValidate: false });
  }

  function handleTitleChange(e: ChangeEvent<HTMLInputElement>): void {
    setTitle(e.target.value);
    if (e.target.value.trim()) setTitleError(false);
  }

  function handleDescriptionChange(e: ChangeEvent<HTMLTextAreaElement>): void {
    setDescription(e.target.value);
  }

  function handleRequestExecute(): void {
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    setConfirmOpen(true);
  }

  function handleExecute(): void {
    if (impact === null) return;

    createMut.mutate(
      {
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        selection: impact.selection,
        evidenceVersion: impact.evidenceVersion,
        idempotencyKey,
      },
      {
        onSuccess: () => {
          toast.success("Recall executed");
          setConfirmOpen(false);
          handleOpenChange(false);
        },
        onError: (e) => {
          setConfirmOpen(false);
          // 409 is the evidence check, not a failure the operator caused: the
          // warehouse moved between the simulate and the execute. Re-run it so
          // they review the new picture rather than guessing what changed.
          if (isApiError(e) && e.status === 409) {
            toast.error("Stock moved since you simulated. Review the updated impact.");
            runSimulation(form.getValues());
            return;
          }
          toast.error(getErrorMessage(e));
        },
      },
    );
  }

  const selectionValid =
    mode === "lots"
      ? lotIds.length > 0
      : mode === "product"
        ? form.watch("productVariantId") !== ""
        : form.watch("vendorId") !== "";

  const footer =
    step === "select" ? (
      <div className="grid w-full grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
        <LoadingButton
          size="sm"
          isPending={simulateMut.isPending}
          loadingText="Simulating…"
          disabled={!selectionValid}
          onClick={handleSubmitSimulate}
        >
          Simulate impact
        </LoadingButton>
      </div>
    ) : (
      <div className="grid w-full auto-cols-fr grid-flow-col gap-2">
        <Button variant="outline" size="sm" onClick={handleBack}>
          Back
        </Button>
        <LoadingButton
          size="sm"
          variant="outline"
          isPending={simulateMut.isPending}
          loadingText="Re-simulating…"
          onClick={handleSubmitSimulate}
        >
          Re-simulate
        </LoadingButton>
        <Button
          size="sm"
          disabled={impact === null || impact.totals.lots === 0 || createMut.isPending}
          onClick={handleRequestExecute}
        >
          Execute recall
        </Button>
      </div>
    );

  if (!canRead) {
    return (
      <AppSheet
        open={open}
        onOpenChange={handleOpenChange}
        title="Plan a recall"
        className="sm:max-w-3xl"
      >
        <NoPermissionState permission="inventory:quality:read" className="flex-1" />
      </AppSheet>
    );
  }

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={handleOpenChange}
        title="Plan a recall"
        description={
          step === "select"
            ? "Say what the recall is about. Nothing is held until you execute."
            : "What this recall would do. Nothing has been held yet."
        }
        footer={canRecall ? footer : undefined}
        className="sm:max-w-3xl"
      >
        {!canRecall ? (
          <NoPermissionState permission="inventory:quality:recall" className="flex-1" />
        ) : step === "select" ? (
          <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(handleSimulate)}>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Recall by</Label>
              <Select value={mode} onValueChange={handleModeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  {RECALL_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {MODE_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mode === "lots" ? (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Lots *</Label>
                <RecallLotPicker
                  value={lotIds}
                  onChange={handleLotsChange}
                />
                {form.formState.errors.lotIds ? (
                  <p className="text-micro text-destructive">
                    {form.formState.errors.lotIds.message}
                  </p>
                ) : null}
              </div>
            ) : null}

            {mode === "product" ? (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Product *</Label>
                <Combobox
                  options={variantOptions}
                  value={form.watch("productVariantId")}
                  onChange={handleVariantChange}
                  placeholder="Select a product…"
                  searchPlaceholder="Search products…"
                />
                {form.formState.errors.productVariantId ? (
                  <p className="text-micro text-destructive">
                    {form.formState.errors.productVariantId.message}
                  </p>
                ) : null}
              </div>
            ) : null}

            {mode === "vendor" ? (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Supplier *</Label>
                <Combobox
                  options={vendorOptions}
                  value={form.watch("vendorId")}
                  onChange={handleVendorChange}
                  placeholder="Select a supplier…"
                  searchPlaceholder="Search suppliers…"
                />
                {form.formState.errors.vendorId ? (
                  <p className="text-micro text-destructive">
                    {form.formState.errors.vendorId.message}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label className="text-xs">Manufactured from</Label>
                <DatePicker
                  value={form.watch("manufacturedFrom") || undefined}
                  onChange={handleManufacturedFromChange}
                  placeholder="Any date"
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label className="text-xs">Manufactured to</Label>
                <DatePicker
                  value={form.watch("manufacturedTo") || undefined}
                  onChange={handleManufacturedToChange}
                  placeholder="Any date"
                />
                {form.formState.errors.manufacturedTo ? (
                  <p className="text-micro text-destructive">
                    {form.formState.errors.manufacturedTo.message}
                  </p>
                ) : null}
              </div>
            </div>

            <p className="text-micro text-muted-foreground">
              Every field narrows the selection. A window with no dates covers every batch of
              whatever you have chosen.
            </p>
          </form>
        ) : impact !== null ? (
          <div className="flex min-w-0 flex-col gap-4">
            <RecallImpactPanel impact={impact} />

            <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs" htmlFor="recall-title">
                  Title *
                </Label>
                <Input
                  id="recall-title"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="e.g. Batch contamination — resin lot 44"
                />
                {titleError ? (
                  <p className="text-micro text-destructive">A recall needs a title</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs" htmlFor="recall-description">
                  Reason <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="recall-description"
                  className="min-h-20 resize-none text-sm"
                  value={description}
                  onChange={handleDescriptionChange}
                  placeholder="What was found, and how."
                />
              </div>
            </div>
          </div>
        ) : null}
      </AppSheet>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive
        keepOpenOnConfirm
        icon={<TriangleAlertIcon className="h-5 w-5" />}
        title="Execute this recall?"
        description={
          impact === null
            ? ""
            : `${impact.totals.lots} lot(s) will be marked RECALLED and ${impact.totals.onHand} units placed on quality hold. Recalled lots can no longer be allocated, picked or shipped.`
        }
        content={
          impact === null ? null : (
            <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
              <li>
                <span className="font-mono tabular-nums">{impact.totals.inTransit}</span> units are
                already in transit and will not be stopped by this.
              </li>
              <li>
                <span className="font-mono tabular-nums">{impact.totals.shipped}</span> units are
                already with customers across {impact.shipped.length} shipment(s).
              </li>
            </ul>
          )
        }
        confirmLabel="Execute recall"
        isPending={createMut.isPending}
        onConfirm={handleExecute}
      />
    </>
  );
}
