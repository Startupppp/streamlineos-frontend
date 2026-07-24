"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEmployeeEmployment, useEmployeeSensitive, useUpdateSensitive } from "@/hooks/api/hr/employees";
import { useCan } from "@/hooks/api/access";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Shield, AlertCircle, Lock } from "lucide-react";
import { EyeIcon, EyeOffIcon } from "@animateicons/react/lucide";
import type { HrSensitiveData } from "@/types/hr/core";
import type { Control } from "react-hook-form";

const emptyOrValid = (schema: z.ZodString) =>
  schema.or(z.literal(""));

const sensitiveSchema = z.object({
  bankAccountNumber: emptyOrValid(
    z.string().refine(
      (v) => /^\d{9,18}$/.test(v),
      "Must be 9–18 digits"
    )
  ),
  bankName: emptyOrValid(z.string().min(1).max(100)),
  ifscCode: emptyOrValid(
    z.string().regex(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, "Invalid IFSC code")
  ),
  pfUanNumber: emptyOrValid(
    z.string().regex(/^\d{12}$/, "UAN must be exactly 12 digits")
  ),
  esiIpNumber: emptyOrValid(z.string().max(20)),
  taxId: emptyOrValid(z.string().min(1).max(100)),
  panNumber: emptyOrValid(
    z.string().regex(/^[A-Za-z]{5}\d{4}[A-Za-z]$/, "Invalid PAN number")
  ),
  passportNumber: emptyOrValid(
    z.string().regex(/^[A-Za-z0-9]{6,9}$/, "Must be 6–9 alphanumeric characters")
  ),
  nationalId: emptyOrValid(z.string().min(1).max(100)),
});

type FormValues = z.infer<typeof sensitiveSchema>;

function sensitiveToForm(data: HrSensitiveData | undefined): FormValues {
  return {
    bankAccountNumber: data?.bankDetails?.accountNumber ?? "",
    bankName: data?.bankDetails?.bankName ?? "",
    ifscCode: data?.bankDetails?.ifsc ?? "",
    pfUanNumber: data?.bankDetails?.pfUanNumber ?? "",
    esiIpNumber: data?.bankDetails?.esiIpNumber ?? "",
    taxId: data?.taxId ?? "",
    panNumber: data?.panNumber ?? "",
    passportNumber: data?.passportNumber ?? "",
    nationalId: data?.nationalId ?? "",
  };
}

function formToSensitive(values: FormValues, existing: HrSensitiveData | undefined): Partial<HrSensitiveData> {
  return {
    bankDetails: {
      ...existing?.bankDetails,
      accountNumber: values.bankAccountNumber || undefined,
      bankName: values.bankName || undefined,
      ifsc: values.ifscCode || undefined,
      pfUanNumber: values.pfUanNumber || undefined,
      esiIpNumber: values.esiIpNumber || undefined,
    },
    taxId: values.taxId === "" ? null : values.taxId,
    panNumber: values.panNumber === "" ? null : values.panNumber,
    passportNumber: values.passportNumber === "" ? null : values.passportNumber,
    nationalId: values.nationalId === "" ? null : values.nationalId,
  };
}

interface MaskedFieldProps {
  label: string;
  value: string | null | undefined;
  editMode: boolean;
  fieldName: keyof FormValues;
  control: Control<FormValues>;
}

function MaskedField({ label, value, editMode, fieldName, control }: MaskedFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const handleToggle = () => setRevealed((prev) => !prev);

  return (
    <FormField
      control={control}
      name={fieldName}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            {label}
          </FormLabel>
          <FormControl>
            {editMode ? (
              <Input
                {...field}
                className="text-sm font-mono"
                placeholder={`Enter ${label}`}
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex-1 h-8 flex items-center px-3 rounded-md border border-border bg-muted/40 text-sm font-mono min-w-0 truncate">
                  {!value ? (
                    <span className="text-muted-foreground text-xs italic">Not set</span>
                  ) : revealed ? (
                    value
                  ) : (
                    "•".repeat(Math.min(value.length, 12))
                  )}
                </span>
                {value && (
                  <Button variant="ghost" size="icon" className="w-8 shrink-0" onClick={handleToggle} type="button">
                    {revealed ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                  </Button>
                )}
              </div>
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface Props {
  userId: string;
}

export function EmployeeSensitiveTab({ userId }: Props) {
  const canView = useCan("hr:sensitive:view");
  const canManage = useCan("hr:sensitive:manage");
  const [editMode, setEditMode] = useState(false);

  const { data: employment, isLoading: empLoading } = useEmployeeEmployment(userId);
  const { data: sensitive, isLoading: sensitiveLoading } = useEmployeeSensitive(
    canView ? employment?.id : undefined
  );

  const updateMutation = useUpdateSensitive(employment?.id ?? 0);

  const form = useForm<FormValues>({
    resolver: zodResolver(sensitiveSchema),
    values: sensitive !== undefined ? sensitiveToForm(sensitive) : undefined,
  });

  const handleEnableEdit = () => {
    form.reset(sensitiveToForm(sensitive));
    setEditMode(true);
  };

  const handleCancel = () => {
    form.reset(sensitiveToForm(sensitive));
    setEditMode(false);
  };

  const onSubmit = form.handleSubmit((values) => {
    updateMutation.mutate(formToSensitive(values, sensitive), {
      onSuccess: () => {
        toast.success("Sensitive data updated");
        setEditMode(false);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  });

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Shield className="w-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground">Access Restricted</p>
        <p className="text-xs text-muted-foreground mt-1">You don&apos;t have permission to view sensitive employee data.</p>
      </div>
    );
  }

  if (empLoading || sensitiveLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!employment) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No employment record found.</p>
      </div>
    );
  }

  const displayValues = sensitiveToForm(sensitive);

  const fields: Array<{ label: string; key: keyof FormValues }> = [
    { label: "Bank Account Number", key: "bankAccountNumber" },
    { label: "Bank Name", key: "bankName" },
    { label: "IFSC / Routing Code", key: "ifscCode" },
    { label: "PF / UAN (12 digits)", key: "pfUanNumber" },
    { label: "ESI IP Number", key: "esiIpNumber" },
    { label: "Tax ID", key: "taxId" },
    { label: "PAN Number", key: "panNumber" },
    { label: "Passport Number", key: "passportNumber" },
    { label: "National ID (Aadhaar / SSN)", key: "nationalId" },
  ];

  return (
    <Form {...form}>
      <form onSubmit={onSubmit}>
        <Card className="rounded-xl border border-border bg-card shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 rounded-lg bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
                  <Shield className="h-3.5 w-3.5 text-rose-600 dark:text-rose-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Sensitive Information</p>
                  <p className="text-[11px] text-muted-foreground">Encrypted at rest — access is audited</p>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-2">
                  {editMode ? (
                    <>
                      <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={handleCancel}>Cancel</Button>
                      <LoadingButton type="submit" size="sm" className="text-xs" isPending={updateMutation.isPending}>Save</LoadingButton>
                    </>
                  ) : (
                    <Button type="button" variant="outline" size="sm" className="text-xs" onClick={handleEnableEdit}>Edit</Button>
                  )}
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map(({ label, key }) => (
                <MaskedField
                  key={key}
                  label={label}
                  value={displayValues[key]}
                  editMode={editMode}
                  fieldName={key}
                  control={form.control}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
