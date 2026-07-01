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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-10" /></TableCell>
          <TableCell><Skeleton className="h-8 w-16" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

interface FlagTableRowProps {
  flag: FeatureFlag;
  onToggle: (flag: FeatureFlag) => void;
  onArchive: (flag: FeatureFlag) => void;
  isUpdating: boolean;
  isArchiving: boolean;
}

function FlagTableRow({ flag, onToggle, onArchive, isUpdating, isArchiving }: FlagTableRowProps) {
  function handleToggle() {
    onToggle(flag);
  }

  function handleArchive() {
    onArchive(flag);
  }

  return (
    <TableRow>
      <TableCell className="px-5 py-3">
        <div>
          <p className="text-sm font-medium">{flag.name}</p>
          {flag.description && (
            <p className="text-xs text-muted-foreground truncate max-w-xs">{flag.description}</p>
          )}
        </div>
      </TableCell>
      <TableCell className="px-5 py-3">
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{flag.key}</code>
      </TableCell>
      <TableCell className="px-5 py-3">
        <TypeBadge type={flag.type} />
      </TableCell>
      <TableCell className="px-5 py-3">
        <Switch
          checked={flag.enabled}
          onCheckedChange={handleToggle}
          disabled={isUpdating}
          aria-label={`Toggle ${flag.name}`}
        />
      </TableCell>
      <TableCell className="px-5 py-3 text-sm text-muted-foreground">
        {flag.type === "percentage" ? `${flag.rolloutPercentage}%` : "—"}
      </TableCell>
      <TableCell className="px-5 py-3 text-right">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-muted-foreground hover:text-destructive"
          onClick={handleArchive}
          disabled={isArchiving}
          aria-label={`Archive ${flag.name}`}
        >
          <Archive className="h-3.5 w-3.5" />
          Archive
        </Button>
      </TableCell>
    </TableRow>
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
      {isLoading ? (
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="px-5 py-3 text-xs font-semibold">Name</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold">Key</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold">Type</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold">Status</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold">Rollout</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody><TableSkeleton /></TableBody>
        </Table>
      ) : isError ? (
        <div className="flex flex-1 flex-col items-center justify-center py-24 gap-3 text-center">
          <AlertCircle className="h-10 w-10 text-destructive/40" />
          <p className="text-sm font-medium">Failed to load feature flags</p>
          <p className="text-xs text-muted-foreground">Something went wrong. Please try again.</p>
          <Button variant="outline" onClick={handleRetry} className="mt-2">
            Retry
          </Button>
        </div>
      ) : visibleFlags.length === 0 ? (
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
      ) : (
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="px-5 py-3 text-xs font-semibold">Name</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold">Key</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold">Type</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold">Status</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold">Rollout</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleFlags.map((flag) => (
              <FlagTableRow
                key={flag.id}
                flag={flag}
                onToggle={handleToggle}
                onArchive={handleArchive}
                isUpdating={updateFlag.isPending}
                isArchiving={archiveFlag.isPending}
              />
            ))}
          </TableBody>
        </Table>
      )}

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>Create Feature Flag</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
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
          </div>
          <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
            <Button type="button" variant="outline" className="flex-1" onClick={handleCloseCreate}>
              Cancel
            </Button>
            <Button type="submit" form="create-flag-form" className="flex-1" disabled={createFlag.isPending}>
              {createFlag.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Create Flag
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
