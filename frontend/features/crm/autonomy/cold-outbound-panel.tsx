"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { statusToneClasses } from "@/lib/design-tokens";
import {
  useColdOutbound,
  useRegisterSendingDomain,
  useResumeColdTrack,
  useSetColdTrack,
  useStartDomainWarmup,
  useVerifySendingDomain,
} from "@/hooks/api/crm/cold-outbound";
import type { SendingDomain } from "@/types/crm/autonomy";

const ON_TONE = statusToneClasses("success");
const OFF_TONE = statusToneClasses("neutral");
const HALTED_TONE = statusToneClasses("danger");

function toneBadgeClass(tone: ReturnType<typeof statusToneClasses>): string {
  return cn("h-5 px-2 py-0.5 text-micro", tone.surface, tone.ink, tone.rule);
}

export function ColdOutboundPanel() {
  const canManage = useCan("crm:autonomy:manage");
  const { data, isLoading, isError, error } = useColdOutbound();

  const [domain, setDomain] = useState("");
  const register = useRegisterSendingDomain();
  const verify = useVerifySendingDomain();
  const warmup = useStartDomainWarmup();
  const setTrack = useSetColdTrack();
  const resume = useResumeColdTrack();

  if (!canManage) return null;

  if (isLoading)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cold outreach</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-gap-field">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </CardContent>
      </Card>
    );

  const cold = data?.domains.find((d) => d.purpose === "cold") ?? null;
  const ready = Boolean(cold?.verifiedAt && cold.warmupStartedAt);
  const unknown = isError || !data;

  const handleRegister = () => {
    register.mutate(
      { domain: domain.trim().toLowerCase(), purpose: "cold" },
      { onSuccess: () => setDomain("") },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Cold outreach
          <Badge variant="outline" className={toneBadgeClass(data?.enabled ? ON_TONE : OFF_TONE)}>
            {data?.enabled ? "On" : "Off"}
          </Badge>
          {data?.pausedAt ? (
            <Badge variant="outline" className={toneBadgeClass(HALTED_TONE)}>
              Halted
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription>
          Writing to people who have not been in touch. It sends from its own domain, on its own
          ramp, so a bad campaign cannot take your invoices and password resets down with it.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-gap-field">
        {isError ? (
          <p role="alert" className="text-label text-muted-foreground">
            {getErrorMessage(error)} — whether cold outreach is running is unknown here. Reload to
            try again.
          </p>
        ) : null}

        
        {data?.pausedAt ? (
          <div className={cn(
              "flex flex-wrap items-center justify-between gap-gap-field rounded-md border p-3",
              HALTED_TONE.surface,
              HALTED_TONE.rule,
            )}>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-medium", HALTED_TONE.ink)}>
                Sending stopped {formatShortDate(data.pausedAt)}
              </p>
              <p className="text-micro text-muted-foreground">
                {data.pauseReason ??
                  "Bounces or complaints crossed their limit."}{" "}
                Nothing goes out until you resume it.
              </p>
            </div>
            <LoadingButton
              size="sm"
              variant="outline"
              isPending={resume.isPending}
              onClick={() => resume.mutate()}
            >
              Resume sending
            </LoadingButton>
          </div>
        ) : null}

        {unknown ? null : cold ? (
          <ColdDomainRow
            domain={cold}
            onVerify={() => verify.mutate(cold.sendingDomainId)}
            onWarmup={() => warmup.mutate(cold.sendingDomainId)}
            isVerifying={verify.isPending}
            isWarming={warmup.isPending}
            failure={
              verify.isError
                ? getErrorMessage(verify.error)
                : warmup.isError
                  ? getErrorMessage(warmup.error)
                  : null
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="cold-domain">Domain to send cold mail from</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="cold-domain"
                value={domain}
                placeholder="acme-outreach.com"
                className="min-w-0 flex-1"
                onChange={(event) => setDomain(event.target.value)}
              />
              <LoadingButton
                size="sm"
                isPending={register.isPending}
                disabled={domain.trim().length === 0}
                onClick={handleRegister}
              >
                Add domain
              </LoadingButton>
            </div>
            <p className="text-micro text-muted-foreground">
              Use a domain you send nothing else from. One per organisation, and it cannot be the
              one your invoices come from.
            </p>
            {register.isError ? (
              <p role="alert" className={cn("text-label", HALTED_TONE.ink)}>
                {getErrorMessage(register.error)}
              </p>
            ) : null}
          </div>
        )}

        {unknown ? null : (
        <div className="flex flex-wrap items-center justify-between gap-gap-field border-t border-border pt-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {data?.enabled ? "Cold outreach is on" : "Cold outreach is off"}
            </p>
            <p className="text-micro text-muted-foreground">
              {ready
                ? data?.enabled
                  ? `On since ${data.enabledAt ? formatShortDate(data.enabledAt) : "recently"}. Volume still follows the ramp.`
                  : "Everything it needs is in place."
                : cold
                  ? "Finish verifying and warming the domain above first."
                  : "Add a sending domain above first."}
            </p>
          </div>
          
          <LoadingButton
            size="sm"
            variant={data?.enabled ? "outline" : "default"}
            isPending={setTrack.isPending}
            disabled={!data?.enabled && !ready}
            onClick={() => setTrack.mutate(!data?.enabled)}
          >
            {data?.enabled ? "Turn off" : "Turn on"}
          </LoadingButton>
          {setTrack.isError ? (
            <p role="alert" className={cn("w-full text-label", HALTED_TONE.ink)}>
              {getErrorMessage(setTrack.error)}
            </p>
          ) : null}
        </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ColdDomainRowProps {
  domain: SendingDomain;
  onVerify: () => void;
  onWarmup: () => void;
  isVerifying: boolean;
  isWarming: boolean;
  failure: string | null;
}

function ColdDomainRow({
  domain,
  onVerify,
  onWarmup,
  isVerifying,
  isWarming,
  failure,
}: ColdDomainRowProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-gap-field">
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm">{domain.domain}</p>
          <p className="text-micro text-muted-foreground">
            {!domain.verifiedAt
              ? "Not verified yet."
              : !domain.warmupStartedAt
                ? `Verified ${formatShortDate(domain.verifiedAt)}. Warm-up has not started.`
                : `Warming since ${formatShortDate(domain.warmupStartedAt)} — volume rises on a fixed ramp.`}
          </p>
        </div>

        {!domain.verifiedAt ? (
          <LoadingButton size="sm" variant="outline" isPending={isVerifying} onClick={onVerify}>
            Check DNS
          </LoadingButton>
        ) : !domain.warmupStartedAt ? (
          <Button size="sm" onClick={onWarmup} disabled={isWarming}>
            Start warm-up
          </Button>
        ) : (
          <Badge variant="outline" className={toneBadgeClass(ON_TONE)}>
            Ready
          </Badge>
        )}
      </div>

      
      {domain.verificationRecord ? (
        <div className="flex flex-col gap-1 rounded-md bg-muted p-2">
          <p className="text-micro text-muted-foreground">
            Publish this TXT record, then check DNS. It can take a few minutes to propagate.
          </p>
          <p className="break-all font-mono text-micro">{domain.verificationRecord.name}</p>
          <p className="break-all font-mono text-micro">{domain.verificationRecord.value}</p>
        </div>
      ) : null}

      {failure ? (
        <p role="alert" className={cn("text-label", HALTED_TONE.ink)}>
          {failure}
        </p>
      ) : null}
    </div>
  );
}
