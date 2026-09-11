"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCan } from "@/hooks/api/access";
import { Landmark, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  useManualMethods,
  useSaveManualMethod,
  useDisableManualMethod,
  type ManualMethodType,
  type PaymentManualMethod,
} from "@/hooks/api/payments";

const METHOD_TYPES: { value: ManualMethodType; label: string }[] = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

function MethodEditor({ methodType, label, existing }: { methodType: ManualMethodType; label: string; existing: PaymentManualMethod | undefined }) {
  const canManage = useCan("payments:manual-methods:manage");
  const save = useSaveManualMethod();
  const disable = useDisableManualMethod();
  const [form, setForm] = useState({
    displayName: existing?.displayName ?? label,
    instructions: existing?.instructions ?? "",
    bankName: existing?.bankName ?? "",
    accountHolder: existing?.accountHolder ?? "",
    maskedAccountNumber: existing?.maskedAccountNumber ?? "",
    ifscSwiftIban: existing?.ifscSwiftIban ?? "",
    upiId: existing?.upiId ?? "",
    paymentReferenceInstructions: existing?.paymentReferenceInstructions ?? "",
    requireManualApproval: existing?.requireManualApproval ?? true,
  });

  function handleSave() {
    save.mutate(
      { methodType, ...form },
      {
        onSuccess: () => toast.success(`${label} saved`),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleDisable() {
    if (!existing) return;
    disable.mutate(existing.id, {
      onSuccess: () => toast.success(`${label} disabled`),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  const isEnabled = existing?.status === "enabled";

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-label font-medium text-foreground">{label}</p>
        </div>
        <span className={cn("text-dense font-medium", isEnabled ? "text-status-success-ink" : "text-muted-foreground")}>
          {isEnabled ? "Enabled" : existing?.status === "disabled" ? "Disabled" : "Missing instructions"}
        </span>
      </div>

      <Input
        value={form.displayName}
        onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
        placeholder="Display name shown on invoices"
        className="text-xs"
      />

      {methodType === "bank_transfer" && (
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={form.bankName}
            onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
            placeholder="Bank name"
            className="text-xs"
          />
          <Input
            value={form.accountHolder}
            onChange={(e) => setForm((p) => ({ ...p, accountHolder: e.target.value }))}
            placeholder="Account holder"
            className="text-xs"
          />
          <Input
            value={form.maskedAccountNumber}
            onChange={(e) => setForm((p) => ({ ...p, maskedAccountNumber: e.target.value }))}
            placeholder="Account number (e.g. ****1234)"
            className="text-xs"
          />
          <Input
            value={form.ifscSwiftIban}
            onChange={(e) => setForm((p) => ({ ...p, ifscSwiftIban: e.target.value }))}
            placeholder="IFSC / SWIFT / IBAN"
            className="text-xs"
          />
        </div>
      )}

      {methodType === "upi" && (
        <Input
          value={form.upiId}
          onChange={(e) => setForm((p) => ({ ...p, upiId: e.target.value }))}
          placeholder="UPI ID (e.g. business@upi)"
          className="text-xs"
        />
      )}

      <Textarea
        value={form.instructions}
        onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
        placeholder="Instructions shown to the customer on the invoice"
        rows={2}
        className="text-xs"
      />

      <label className="flex items-center gap-1.5 text-dense text-muted-foreground">
        <Checkbox
          checked={form.requireManualApproval}
          onCheckedChange={(v) => setForm((p) => ({ ...p, requireManualApproval: v === true }))}
        />
        Require manual approval before marking invoice paid
      </label>

      <div className="flex items-center gap-2">
        {canManage ? (
          <Button size="sm" className="text-xs gap-1.5" onClick={handleSave} disabled={save.isPending}>
            <Save className="h-3 w-3" /> Save
          </Button>
        ) : null}
        {canManage && existing && existing.status !== "disabled" && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground"
            onClick={handleDisable}
          >
            Disable
          </Button>
        )}
      </div>
    </div>
  );
}

export function ManualMethodsPanel() {
  const canView = useCan("payments:providers:view");
  const { data: methods, isLoading, isError, error, refetch } = useManualMethods();

  function handleRetryLoad() {
    void refetch();
  }

  // A denied or failed read settles to `methods === undefined`, which the
  // editors below would render as five blank forms reading "Missing
  // instructions" — an operator would conclude their live bank details were
  // gone, and a Save from that state would overwrite them with blanks.
  if (!canView) {
    return (
      <NoPermissionState
        compact
        permission="payments:providers:view"
        title="Payment instructions hidden"
        description="You do not have permission to view this organization's offline payment instructions."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        compact
        title="Failed to load payment instructions"
        description={getErrorMessage(error)}
        onRetry={handleRetryLoad}
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-label text-muted-foreground">
        Configure offline payment instructions shown on invoices. Customers pay outside
        StreamlineOS; you record the payment manually once received.
      </p>
      {METHOD_TYPES.map((mt) => (
        <MethodEditor
          key={mt.value}
          methodType={mt.value}
          label={mt.label}
          existing={methods?.find((m) => m.methodType === mt.value)}
        />
      ))}
    </div>
  );
}
