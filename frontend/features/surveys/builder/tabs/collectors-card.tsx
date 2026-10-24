"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Info, Plus } from "lucide-react";
import { CopyIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorState } from "@/components/shared/error-state";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { CollectorEmbedSettings } from "./collector-embed-settings";
import {
  useCollectors,
  useCreateCollector,
  usePatchCollector,
  type CollectorStatus,
} from "@/hooks/api/surveys/collectors";
import {
  COLLECTOR_TYPES,
  COLLECTOR_TYPE_LABELS,
  collectorCreateSchema,
  type CollectorCreateValues,
} from "./collector-create-schema";

const STATUS_VARIANT: Record<
  CollectorStatus,
  "default" | "secondary" | "outline"
> = {
  active: "default",
  paused: "outline",
  closed: "secondary",
  expired: "secondary",
};

function publicLinkFor(token: string): string {
  if (typeof window === "undefined") return `/s/${token}`;
  return `${window.location.origin}/s/${token}`;
}

export function CollectorsCard({ surveyId }: { surveyId: number }) {
  const { data: collectors, isLoading, isError, error, refetch } =
    useCollectors(surveyId);
  const createCollector = useCreateCollector(surveyId);
  const patchCollector = usePatchCollector(surveyId);
  const form = useForm<CollectorCreateValues>({
    resolver: zodResolver(collectorCreateSchema),
    defaultValues: { collectorType: "public_link" },
  });

  async function handleCreate(values: CollectorCreateValues) {
    try {
      await createCollector.mutateAsync({
        collectorType: values.collectorType,
        name: COLLECTOR_TYPE_LABELS[values.collectorType],
      });
      toast.success("Collector created");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleCopyLink(token: string) {
    await navigator.clipboard.writeText(publicLinkFor(token));
    toast.success("Link copied");
  }

  async function handleToggleStatus(
    collectorId: number,
    status: CollectorStatus,
  ) {
    try {
      await patchCollector.mutateAsync({
        collectorId,
        input: { status: status === "active" ? "paused" : "active" },
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function copyLinkHandler(token: string) {
    return function handleCopyCollectorLink() {
      void handleCopyLink(token);
    };
  }

  function toggleStatusHandler(collectorId: number, status: CollectorStatus) {
    return function handleToggleCollectorStatus() {
      void handleToggleStatus(collectorId, status);
    };
  }

  function handleRetryCollectors() {
    void refetch();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm">
          Collectors
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="About privacy and collectors"
                >
                  <Info className="size-3.5" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="max-w-xs text-left">
                A response is identified when someone uses a participant link or
                email, and anonymous otherwise. One-per-email and expiry are set
                on each collector.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardAction className="col-span-full row-start-2 mt-2 w-full justify-self-stretch @md/card-header:col-span-1 @md/card-header:col-start-2 @md/card-header:row-span-2 @md/card-header:row-start-1 @md/card-header:mt-0 @md/card-header:w-auto @md/card-header:justify-self-end">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleCreate)}
              className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
            >
              <FormField
                control={form.control}
                name="collectorType"
                render={({ field }) => (
                  <FormItem className="min-w-0 flex-1 sm:flex-none">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger
                          className={cn(FILTER_SELECT_TRIGGER, "w-full sm:w-52")}
                          aria-label="Collector type"
                        >
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COLLECTOR_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {COLLECTOR_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <LoadingButton
                type="submit"
                size="sm"
                isPending={createCollector.isPending}
              >
                <Plus className="size-3.5" />
                Add collector
              </LoadingButton>
            </form>
          </Form>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
                  <Skeleton className="h-3.5 w-12" />
                  <Skeleton className="h-3.5 w-12" />
                  <Skeleton className="h-3.5 w-16" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-9 min-w-0 flex-1 basis-full rounded-md sm:basis-auto" />
                <Skeleton className="size-9 shrink-0 rounded-md" />
                <Skeleton className="h-9 w-20 shrink-0 rounded-md" />
              </div>
            </div>
          </div>
        ) : isError ? (
          <ErrorState
            compact
            title="Couldn't load collectors"
            description={getErrorMessage(error)}
            onRetry={handleRetryCollectors}
          />
        ) : (
          collectors?.map((collector) => (
            <div
              key={collector.id}
              className="flex flex-col gap-2 rounded-md border border-border p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 text-sm font-medium">
                  {collector.name}
                </span>
                <Badge variant={STATUS_VARIANT[collector.status]}>
                  {collector.status}
                </Badge>
                <div className="flex w-full flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground sm:ml-auto sm:w-auto">
                  <span>{collector.opens} opens</span>
                  <span>{collector.starts} starts</span>
                  <span>{collector.completions} completions</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  readOnly
                  value={publicLinkFor(collector.token)}
                  className="min-w-0 flex-1 basis-full sm:basis-auto"
                />
                <AnimatedIconButton
                  icon={CopyIcon}
                  iconSize={14}
                  variant="outline"
                  size="icon"
                  className="size-9 shrink-0"
                  aria-label="Copy survey link"
                  onClick={copyLinkHandler(collector.token)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleStatusHandler(collector.id, collector.status)}
                >
                  {collector.status === "active" ? "Pause" : "Activate"}
                </Button>
              </div>
              {(collector.collectorType === "embed" ||
                collector.collectorType === "popup") && (
                <CollectorEmbedSettings
                  surveyId={surveyId}
                  collector={collector}
                />
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
