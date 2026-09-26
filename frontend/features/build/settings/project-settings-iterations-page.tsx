"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { useIterationSettings, useUpdateIterationSettings } from "@/hooks/api/build/iteration-settings";
import { updateIterationSettingsSchema, type UpdateIterationSettingsInput } from "@/hooks/api/build/iteration-settings-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PmPanel, PmSection } from "@/components/pm-chrome";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE, TEXT_BODY } from "@/lib/text-overflow";

interface ProjectSettingsIterationsPageProps {
  projectId: number;
}

const DURATION_OPTIONS = [
  { value: 1, label: "1 week" },
  { value: 2, label: "2 weeks" },
  { value: 3, label: "3 weeks" },
  { value: 4, label: "4 weeks" },
] as const;

export function ProjectSettingsIterationsPage({ projectId }: ProjectSettingsIterationsPageProps) {
  const canUpdate = useCan("build:update");
  const { data: settings, isLoading, isError, error, refetch } = useIterationSettings(projectId);
  const updateSettings = useUpdateIterationSettings(projectId);

  const pageState = usePageState({
    permission: "build:update",
    isLoading,
    isError,
    error,
    isEmpty: false,
  });

  const form = useForm<UpdateIterationSettingsInput>({
    resolver: zodResolver(updateIterationSettingsSchema),
    defaultValues: {
      defaultDurationWeeks: 2,
      namingPrefix: "Cycle",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        defaultDurationWeeks: settings.defaultDurationWeeks,
        namingPrefix: settings.namingPrefix,
      });
    }
  }, [settings, form]);

  const handleSubmit = useCallback(
    (data: UpdateIterationSettingsInput) => {
      updateSettings.mutate(data, {
        onSuccess: () => toast.success("Iteration settings saved"),
        onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
      });
    },
    [updateSettings],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PageWrapper
      title="Iterations"
      subtitle="Configure default cadence and naming for project cycles"
    >
      <PmPageShell>
        <PageState
          resolution={pageState}
          loading={
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          }
          onRetry={handleRetry}
          className="flex-1"
        >
          <PmSection index={0} className="flex-1">
            <PmPanel className="p-4" solid>
              <div className="mb-3 border-b border-border pb-3">
                <h3 className={cn("text-sm font-semibold", TEXT_ONE_LINE)}>
                  Cycle Defaults
                </h3>
                <p className={cn("mt-0.5 text-xs text-muted-foreground", TEXT_BODY)}>
                  These defaults apply when creating new cycles in this project.
                </p>
              </div>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="defaultDurationWeeks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default cycle length</FormLabel>
                        <Select
                          disabled={!canUpdate || updateSettings.isPending}
                          value={String(field.value ?? 2)}
                          onValueChange={(value) => field.onChange(Number(value))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DURATION_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={String(opt.value)}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="namingPrefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Naming prefix</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Cycle"
                            maxLength={20}
                            disabled={!canUpdate || updateSettings.isPending}
                            aria-label="Naming prefix"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {canUpdate ? (
                    <LoadingButton
                      type="submit"
                      size="sm"
                      isPending={updateSettings.isPending}
                      loadingText="Saving…"
                    >
                      Save Changes
                    </LoadingButton>
                  ) : null}
                </form>
              </Form>
            </PmPanel>
          </PmSection>
        </PageState>
      </PmPageShell>
    </PageWrapper>
  );
}
