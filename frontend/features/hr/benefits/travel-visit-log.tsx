"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HrSheet } from "@/features/hr/hr-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useTravelVisitLogs, useAddTravelVisitLog, type TravelVisitLog } from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatDistanceToNow } from "date-fns";

const visitSchema = z.object({
  visitedAt: z.string().min(1, "Visit date is required"),
  location: z.string().min(1, "Location is required"),
  lat: z.string().optional(),
  lng: z.string().optional(),
  note: z.string().optional(),
});

type VisitFormValues = z.infer<typeof visitSchema>;

function VisitLogEntry({ log }: { log: TravelVisitLog }) {
  return (
    <div className="flex gap-3 pb-4 border-b border-border/40 last:border-0 last:pb-0">
      <div className="relative flex flex-col items-center">
        <div className="h-7 w-7 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center shrink-0">
          <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground leading-tight">{log.location}</p>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDistanceToNow(new Date(log.visitedAt), { addSuffix: true })}
          </span>
        </div>
        {log.note && (
          <p className="text-xs text-muted-foreground mt-1">{log.note}</p>
        )}
        {(log.lat ?? log.lng) && (
          <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">
            {log.lat}, {log.lng}
          </p>
        )}
      </div>
    </div>
  );
}

interface Props {
  travelRequestId: number;
}

export function TravelVisitLog({ travelRequestId }: Props) {
  const { data: logs, isLoading } = useTravelVisitLogs(travelRequestId);
  const addLog = useAddTravelVisitLog();
  const [sheetOpen, setSheetOpen] = useState(false);

  const form = useForm<VisitFormValues>({
    resolver: zodResolver(visitSchema),
    defaultValues: { visitedAt: "", location: "", lat: "", lng: "", note: "" },
  });

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) form.reset();
      setSheetOpen(open);
    },
    [form],
  );

  const handleSubmit = useCallback(() => {
    void form.handleSubmit((values) => {
      toast.promise(
        addLog.mutateAsync({
          travelRequestId,
          visitedAt: new Date(values.visitedAt).toISOString(),
          location: values.location,
          lat: values.lat || undefined,
          lng: values.lng || undefined,
          note: values.note || undefined,
        }),
        {
          loading: "Adding visit log...",
          success: () => {
            setSheetOpen(false);
            form.reset();
            return "Visit log added";
          },
          error: (e: unknown) => getErrorMessage(e),
        },
      );
    })();
  }, [form, addLog, travelRequestId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Field Visit Log</p>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleOpenSheet}>
          <Plus className="h-3 w-3" />
          Log Visit
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      ) : !logs?.length ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No visit logs yet</p>
      ) : (
        <div className="space-y-0">
          {logs.map((log) => (
            <VisitLogEntry key={log.id} log={log} />
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Log Field Visit"
        description="Record a location visited during this trip"
        onSubmit={handleSubmit}
        submitLabel="Add Log"
        isPending={addLog.isPending}
      >
        <div className="space-y-1.5">
          <Label htmlFor="visitedAt">Visit Date & Time <span className="text-destructive">*</span></Label>
          <Input id="visitedAt" type="datetime-local" {...form.register("visitedAt")} />
          {form.formState.errors.visitedAt && (
            <p className="text-xs text-destructive">{form.formState.errors.visitedAt.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location">Location <span className="text-destructive">*</span></Label>
          <Input id="location" placeholder="Office, client site, conference center..." {...form.register("location")} />
          {form.formState.errors.location && (
            <p className="text-xs text-destructive">{form.formState.errors.location.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="lat">Latitude (optional)</Label>
            <Input id="lat" placeholder="12.9716" {...form.register("lat")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lng">Longitude (optional)</Label>
            <Input id="lng" placeholder="77.5946" {...form.register("lng")} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="note">Note</Label>
          <Textarea id="note" rows={3} placeholder="Meeting with client, site inspection..." {...form.register("note")} />
        </div>
      </HrSheet>
    </div>
  );
}
