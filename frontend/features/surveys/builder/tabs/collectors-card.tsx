"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CopyIcon, PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorState } from "@/components/shared/error-state";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { useCollectors, useCreateCollector, usePatchCollector, type CollectorType, type CollectorStatus } from "@/hooks/api/surveys/collectors";

const COLLECTOR_TYPES = [
  "public_link",
  "email",
  "qr",
  "embed",
  "popup",
  "crm_campaign",
  "hr_audience",
] as const satisfies readonly CollectorType[];

const COLLECTOR_TYPE_LABELS: Record<CollectorType, string> = {
  public_link: "Public link",
  email: "Email invitation",
  qr: "QR code",
  embed: "Website embed",
  popup: "Popup",
  crm_campaign: "CRM campaign",
  hr_audience: "HR employee audience",
  support_trigger: "Support ticket trigger",
  live_session: "Live session",
  manual_access_code: "Manual access code",
};

const STATUS_VARIANT: Record<CollectorStatus, "default" | "secondary" | "outline"> = {
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
  const { data: collectors, isLoading, isError, error, refetch } = useCollectors(surveyId);
  const createCollector = useCreateCollector(surveyId);
  const patchCollector = usePatchCollector(surveyId);
  const [newType, setNewType] = useState<CollectorType>("public_link");

  async function handleCreate() {
    try {
      await createCollector.mutateAsync({ collectorType: newType, name: COLLECTOR_TYPE_LABELS[newType] });
      toast.success("Collector created");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleCopyLink(token: string) {
    await navigator.clipboard.writeText(publicLinkFor(token));
    toast.success("Link copied");
  }

  function handleNewTypeChange(v: string): void {
    const next = COLLECTOR_TYPES.find((candidate) => candidate === v);
    if (next) setNewType(next);
  }

  async function handleToggleStatus(collectorId: number, status: CollectorStatus) {
    try {
      await patchCollector.mutateAsync({ collectorId, input: { status: status === "active" ? "paused" : "active" } });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Collectors</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : isError ? (
          <ErrorState compact title="Couldn't load collectors" description={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : (
          collectors?.map((collector) => (
            <div key={collector.id} className="rounded-md border border-border p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{collector.name}</span>
                <Badge variant={STATUS_VARIANT[collector.status]}>{collector.status}</Badge>
                <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{collector.opens} opens</span>
                  <span>{collector.starts} starts</span>
                  <span>{collector.completions} completions</span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Input readOnly value={publicLinkFor(collector.token)} className="flex-1" />
                <AnimatedIconButton icon={CopyIcon} iconSize={14} variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Copy survey link" onClick={() => handleCopyLink(collector.token)} />
                <Button variant="outline" size="sm" onClick={() => handleToggleStatus(collector.id, collector.status)}>
                  {collector.status === "active" ? "Pause" : "Activate"}
                </Button>
              </div>
            </div>
          ))
        )}

        <div className="flex items-center gap-2">
          <Select
            value={newType}
            onValueChange={handleNewTypeChange}
          >
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[200px]")}><SelectValue /></SelectTrigger>
            <SelectContent>
              {COLLECTOR_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{COLLECTOR_TYPE_LABELS[type]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1.5" size="sm" onClick={handleCreate} disabled={createCollector.isPending}>
            Add collector
          </AnimatedIconButton>
        </div>
      </CardContent>
    </Card>
  );
}
