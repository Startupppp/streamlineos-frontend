"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { AppSheet, ErrorState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoadingButton } from "@/components/ui/loading-button";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  describeSampling,
  useActivatePlanVersion,
  useCreatePlanVersion,
  useInspectionPlan,
  type InspectionPlanVersion,
  type PlanVersionStatus,
} from "@/hooks/api/inventory/inspection-plans";
import {
  SAMPLING_METHODS,
  SAMPLING_METHOD_LABEL,
  planVersionFormSchema,
  type PlanVersionFormValues,
} from "./inspection-plan-schema";

interface InspectionPlanDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: number | null;
  canManage: boolean;
}

const VERSION_TONE: Record<PlanVersionStatus, StatusTone> = {
  ACTIVE: "success",
  DRAFT: "info",
  SUPERSEDED: "neutral",
};

const VERSION_LABEL: Record<PlanVersionStatus, string> = {
  ACTIVE: "Live",
  DRAFT: "Draft",
  SUPERSEDED: "Superseded",
};

/**
 * The version history, and the only two things that may be done to it: publish a
 * new rule, or make a draft live. A published version is never edited — an
 * inspection records the version it was judged against, so editing one rewrites
 * the standard a completed result was measured by.
 */
export function InspectionPlanDetailSheet({
  open,
  onOpenChange,
  planId,
  canManage,
}: InspectionPlanDetailSheetProps) {
  const planQuery = useInspectionPlan(planId ?? 0);
  const activateVersion = useActivatePlanVersion();
  const [showNewVersion, setShowNewVersion] = useState(false);

  function handleToggleNewVersion(): void {
    setShowNewVersion((previous) => !previous);
  }

  function handleActivate(versionId: number): void {
    if (planId === null) return;
    activateVersion.mutate(
      { planId, versionId },
      {
        onSuccess: () => toast.success("Version published"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleRetry(): void {
    void planQuery.refetch();
  }

  const plan = planQuery.data;

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={plan ? plan.name : "Inspection plan"}
      description={plan ? plan.code : undefined}
      className="sm:max-w-xl"
    >
      {planQuery.isError ? (
        <ErrorState
          title="Couldn't load this plan"
          description={getErrorMessage(planQuery.error)}
          onRetry={handleRetry}
        />
      ) : planQuery.isLoading || !plan ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-border/70 bg-card p-4">
            <p className="text-label font-medium text-muted-foreground">Applies to</p>
            <p className="text-sm">
              {plan.appliesOnReceipt ? "Goods receipts" : null}
              {plan.appliesOnReceipt && plan.appliesOnReturn ? " and " : null}
              {plan.appliesOnReturn ? "Returns" : null}
            </p>
            {plan.description ? (
              <p className="mt-2 text-label text-muted-foreground">{plan.description}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Versions</h3>
            {canManage ? (
              <Button variant="outline" size="sm" onClick={handleToggleNewVersion}>
                {showNewVersion ? "Cancel" : "New version"}
              </Button>
            ) : null}
          </div>

          {showNewVersion && planId !== null ? (
            <NewVersionForm planId={planId} onDone={handleToggleNewVersion} />
          ) : null}

          <ul className="space-y-2">
            {(plan.versions ?? []).map((version) => (
              <VersionRow
                key={version.id}
                version={version}
                canManage={canManage}
                isPending={activateVersion.isPending}
                onActivate={handleActivate}
              />
            ))}
          </ul>
        </div>
      )}
    </AppSheet>
  );
}

interface VersionRowProps {
  version: InspectionPlanVersion;
  canManage: boolean;
  isPending: boolean;
  onActivate: (versionId: number) => void;
}

function VersionRow({ version, canManage, isPending, onActivate }: VersionRowProps) {
  const tone = statusToneClasses(VERSION_TONE[version.status]);

  function handleActivate(): void {
    onActivate(version.id);
  }

  return (
    <li className="rounded-lg border border-border/70 bg-card px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            v{version.version} · {describeSampling(version.samplingMethod, version.sampleValue)}
          </p>
          <p className="text-dense text-muted-foreground tabular-nums">
            {version.activatedAt
              ? `Live since ${format(new Date(version.activatedAt), "dd MMM yyyy")}`
              : `Drafted ${format(new Date(version.createdAt), "dd MMM yyyy")}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant="outline"
            className={cn("h-5 px-2 py-0.5 text-micro", tone.surface, tone.ink, tone.rule)}
          >
            {VERSION_LABEL[version.status]}
          </Badge>
          {canManage && version.status === "DRAFT" ? (
            <LoadingButton
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              isPending={isPending}
              loadingText="Publishing…"
              onClick={handleActivate}
            >
              Publish
            </LoadingButton>
          ) : null}
        </div>
      </div>
      {version.instructions ? (
        <p className="mt-2 text-label text-muted-foreground">{version.instructions}</p>
      ) : null}
    </li>
  );
}

interface NewVersionFormProps {
  planId: number;
  onDone: () => void;
}

function NewVersionForm({ planId, onDone }: NewVersionFormProps) {
  const createVersion = useCreatePlanVersion();
  const form = useForm<PlanVersionFormValues>({
    resolver: zodResolver(planVersionFormSchema),
    defaultValues: { samplingMethod: "ALL", sampleValue: "", instructions: "", activate: true },
  });
  const samplingMethod = form.watch("samplingMethod");

  function handleSubmit(values: PlanVersionFormValues): void {
    createVersion.mutate(
      {
        planId,
        payload: {
          samplingMethod: values.samplingMethod,
          ...(values.samplingMethod === "ALL" ? {} : { sampleValue: values.sampleValue?.trim() }),
          ...(values.instructions ? { instructions: values.instructions } : {}),
          activate: values.activate,
        },
      },
      {
        onSuccess: () => {
          toast.success(values.activate ? "Version published" : "Draft version saved");
          onDone();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 rounded-xl border border-border/70 bg-card p-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="samplingMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sampling</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    {SAMPLING_METHODS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {SAMPLING_METHOD_LABEL[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {samplingMethod === "ALL" ? null : (
            <FormField
              control={form.control}
              name="sampleValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {samplingMethod === "PERCENTAGE" ? "Percentage" : "Units per delivery"}
                  </FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Inspector instructions</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="activate"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between gap-2 rounded-md border border-border/70 px-3 py-2">
              <div className="space-y-0.5">
                <FormLabel>Publish now</FormLabel>
                <FormDescription>Supersedes the version that is live today.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <LoadingButton type="submit" isPending={createVersion.isPending}>
            Save version
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}
