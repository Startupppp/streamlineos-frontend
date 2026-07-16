"use client";

import { useState } from "react";
import { useEmployeeEmployment, useEmployeeSensitive, useUpdateSensitive } from "@/hooks/api/hr/employees";
import { useCan } from "@/hooks/api/access";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Shield, AlertCircle } from "lucide-react";
import { EyeIcon, EyeOffIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Lock } from "lucide-react";
import type { HrSensitiveData } from "@/types/hr/core";
import { useForm } from "react-hook-form";

interface Props {
  userId: string;
}

function MaskedField({
  label,
  value,
  editMode,
  fieldName,
  register,
}: {
  label: string;
  value: string | null | undefined;
  editMode: boolean;
  fieldName: keyof HrSensitiveData;
  register: ReturnType<typeof useForm<HrSensitiveData>>["register"];
}) {
  const [revealed, setRevealed] = useState(false);
  const handleToggle = () => setRevealed((prev) => !prev);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Lock className="h-3 w-3" />
        {label}
      </Label>
      {editMode ? (
        <Input
          {...register(fieldName)}
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
            <Button variant="ghost" size="icon" className="w-8 shrink-0" onClick={handleToggle}>
              {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      )}
    </div>
  );
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

  const { register, handleSubmit, reset } = useForm<HrSensitiveData>({
    values: sensitive ?? undefined,
  });

  const handleEnableEdit = () => {
    reset(sensitive ?? undefined);
    setEditMode(true);
  };

  const handleCancel = () => setEditMode(false);

  const onSubmit = handleSubmit((data) => {
    updateMutation.mutate(data, {
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

  const fields: Array<{ label: string; key: keyof HrSensitiveData }> = [
    { label: "Bank Account Number", key: "bankAccountNumber" },
    { label: "Bank Name", key: "bankName" },
    { label: "IFSC / Routing Code", key: "ifscCode" },
    { label: "Tax ID", key: "taxId" },
    { label: "PAN Number", key: "panNumber" },
    { label: "Passport Number", key: "passportNumber" },
    { label: "National ID", key: "nationalId" },
    { label: "Aadhaar Number", key: "aadharNumber" },
    { label: "SSN", key: "ssn" },
  ];

  return (
    <form onSubmit={onSubmit}>
      <Card className="rounded-xl border border-border bg-card shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 rounded-lg bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center">
                <Shield className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
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
                value={sensitive?.[key]}
                editMode={editMode}
                fieldName={key}
                register={register}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
