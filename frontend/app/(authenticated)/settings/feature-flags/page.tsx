"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Archive, Flag, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  useFeatureFlags,
  useCreateFlag,
  useUpdateFlag,
  useArchiveFlag,
  type FeatureFlag,
  type CreateFlagInput,
} from "@/hooks/api/feature-flags";
import { getApiError } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function FeatureFlagsPage() {
  return (
    <DashboardGate permission="settings:manage">
      <FeatureFlagsContent />
    </DashboardGate>
  );
}

const FLAG_TYPES = ["global", "percentage", "org", "user"] as const;

const createFlagSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  key: z.string().trim().min(1, "Key is required").regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers and underscores"),
  description: z.string().optional(),
  type: z.enum(FLAG_TYPES),
  enabled: z.boolean(),
  rolloutPercentage: z.number().min(0).max(100),
});

type CreateFlagForm = z.infer<typeof createFlagSchema>;

function slugifyKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function TypeBadge({ type }: { type: FeatureFlag["type"] }) {
  const variants: Record<FeatureFlag["type"], "default" | "secondary" | "outline"> = {
    global: "default",
    percentage: "secondary",
    org: "outline",
    user: "outline",
  };
  return (
    <Badge variant={variants[type]} className="capitalize text-xs">
      {type}
    </Badge>
  );
}

function FeatureFlagsContent() {
  const { data: flags, isLoading, isError, refetch } = useFeatureFlags();
  const updateFlag = useUpdateFlag();
  const archiveFlag = useArchiveFlag();
  const createFlag = useCreateFlag();
  const [createOpen, setCreateOpen] = useState(false);

  const form = useForm<CreateFlagForm>({
    resolver: zodResolver(createFlagSchema),
    defaultValues: { name: "", key: "", description: "", type: "global", enabled: false, rolloutPercentage: 0 },
  });

  const watchedType = form.watch("type");

  function handleRetry() {
    refetch();
  }

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      form.setValue("name", e.target.value);
      if (!form.getFieldState("key").isDirty) {
        form.setValue("key", slugifyKey(e.target.value));
      }
    },
    [form],
  );

  const handleToggle = useCallback(
    (flag: FeatureFlag) => {
      updateFlag.mutate(
        { key: flag.key, enabled: !flag.enabled },
        {
          onSuccess: () => toast.success(`Flag ${flag.enabled ? "disabled" : "enabled"}`),
          onError: (err) => toast.error(getApiError(err)),
        },
      );
    },
    [updateFlag],
  );

  const handleArchive = useCallback(
    (flag: FeatureFlag) => {
      archiveFlag.mutate(flag.key, {
        onSuccess: () => toast.success("Flag archived"),
        onError: (err) => toast.error(getApiError(err)),
      });
    },
    [archiveFlag],
  );

  const handleCreate = useCallback(
    (values: CreateFlagForm) => {
      const input: CreateFlagInput = {
        key: values.key,
        name: values.name,
        type: values.type,
        enabled: values.enabled,
        ...(values.description ? { description: values.description } : {}),
        ...(values.type === "percentage" ? { rolloutPercentage: values.rolloutPercentage } : {}),
      };
      createFlag.mutate(input, {
        onSuccess: () => {
          toast.success("Feature flag created");
          setCreateOpen(false);
          form.reset();
        },
        onError: (err) => toast.error(getApiError(err)),
      });
    },
    [createFlag, form],
  );

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCloseCreate = useCallback(() => {
    setCreateOpen(false);
    form.reset();
  }, [form]);

  const visibleFlags = (flags ?? []).filter((f) => !f.isArchived);

  const columns: DataTableColumn<FeatureFlag>[] = [
    {
      key: "name",
      header: "Name",
      cell: (flag) => (
        <div>
          <p className="text-sm font-medium">{flag.name}</p>
          {flag.description && (
            <p className="text-xs text-muted-foreground truncate max-w-xs">{flag.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "key",
      header: "Key",
      cell: (flag) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{flag.key}</code>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (flag) => <TypeBadge type={flag.type} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (flag) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={flag.enabled}
            onCheckedChange={() => handleToggle(flag)}
            disabled={updateFlag.isPending}
            aria-label={`Toggle ${flag.name}`}
          />
        </div>
      ),
    },
    {
      key: "rollout",
      header: "Rollout",
      cell: (flag) => (
        <span className="text-sm text-muted-foreground">
          {flag.type === "percentage" ? `${flag.rolloutPercentage}%` : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (flag) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground hover:text-destructive"
            onClick={() => handleArchive(flag)}
            disabled={archiveFlag.isPending}
            aria-label={`Archive ${flag.name}`}
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </Button>
        </div>
      ),
    },
  ];

  const emptyState = isError ? (
    <div className="flex flex-1 flex-col items-center justify-center py-24 gap-3 text-center">
      <AlertCircle className="h-10 w-10 text-destructive/40" />
      <p className="text-sm font-medium">Failed to load feature flags</p>
      <p className="text-xs text-muted-foreground">Something went wrong. Please try again.</p>
      <Button variant="outline" onClick={handleRetry} className="mt-2">
        Retry
      </Button>
    </div>
  ) : (
    <div className="flex flex-1 flex-col items-center justify-center py-24 gap-3 text-center">
      <Flag className="h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm font-medium">No feature flags yet</p>
      <p className="text-xs text-muted-foreground max-w-xs">
        Create a flag to control feature rollouts across your platform.
      </p>
      <Button onClick={handleOpenCreate} className="mt-2 gap-2">
        <Plus className="h-4 w-4" /> New Flag
      </Button>
    </div>
  );

  return (
    <PageWrapper
      title="Feature Flags"
      subtitle="Control feature availability across your platform"
      actions={
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" /> New Flag
        </Button>
      }
    >
      <DataTable
        data={visibleFlags}
        columns={columns}
        getRowKey={(flag) => flag.id}
        isLoading={isLoading}
        emptyState={emptyState}
        className="flex-1 min-h-0"
      />

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>Create Feature Flag</SheetTitle>
          </SheetHeader>
          <SheetBody className="px-6 py-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreate)} id="create-flag-form" className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Google OAuth Login"
                        onChange={handleNameChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="google_oauth_login" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="What does this flag control?" rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="global">Global</SelectItem>
                        <SelectItem value="percentage">Percentage rollout</SelectItem>
                        <SelectItem value="org">Organization</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedType === "percentage" && (
                <FormField
                  control={form.control}
                  name="rolloutPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rollout Percentage</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={0} max={100} placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="cursor-pointer">Enable immediately</FormLabel>
                  </FormItem>
                )}
              />

            </form>
          </Form>
          </SheetBody>
          <SheetFooter className="shrink-0 px-6 py-4 border-t">
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button type="button" variant="outline" onClick={handleCloseCreate}>
                Cancel
              </Button>
              <Button type="submit" form="create-flag-form" disabled={createFlag.isPending}>
                {createFlag.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Create Flag
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
