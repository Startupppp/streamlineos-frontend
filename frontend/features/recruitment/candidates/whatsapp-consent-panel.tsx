"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useCandidateWhatsapp,
  useRecordWhatsappConsent,
} from "@/hooks/api/hr/recruitment/whatsapp";

interface Props {
  candidateId: number;
}

export function WhatsappConsentPanel({ candidateId }: Props) {
  const { data, isLoading, isError } = useCandidateWhatsapp(candidateId);
  const record = useRecordWhatsappConsent(candidateId);
  const canManage = useCan("hr:requisitions:manage");

  const handleOptIn = useCallback(() => {
    record.mutate(true, {
      onSuccess: () => toast.success("Opt-in recorded"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [record]);

  const handleOptOut = useCallback(() => {
    record.mutate(false, {
      onSuccess: () => toast.success("Opt-out recorded"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [record]);

  if (isLoading) return <Skeleton className="h-14 w-full" />;
  if (isError || !data) return null;

  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">WhatsApp</span>
          <Badge variant="outline" className="text-micro">
            {data.canSend ? "Opted in" : "Not opted in"}
          </Badge>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleOptIn} disabled={record.isPending}>
              Record opt-in
            </Button>
            <Button size="sm" variant="ghost" onClick={handleOptOut} disabled={record.isPending}>
              Record opt-out
            </Button>
          </div>
        )}
      </div>

      
      {data.refusal && <p className="text-xs text-muted-foreground">{data.refusal}</p>}

      {data.optInAt && (
        <p className="text-xs text-muted-foreground">
          Opted in {formatDateTime(data.optInAt)}
          {data.optOutAt ? ` · opted out ${formatDateTime(data.optOutAt)}` : ""}
        </p>
      )}

      
      {data.providerBlockedReason && (
        <p className="text-xs text-muted-foreground">
          {data.providerBlockedReason} A WhatsApp message composed below is recorded against the
          candidate as a note — it is not delivered.
        </p>
      )}
    </div>
  );
}
