"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useRevokeAllCalendarLinks,
  useUpdateCalendarAdminPolicy,
} from "@/hooks/api/calendar-admin";
import type {
  CalendarAdminPolicy,
  CalendarExportPolicy,
  CalendarProviderWriteScope,
} from "@/hooks/api/calendar-admin-schema";

function exportPolicy(value: string): CalendarExportPolicy {
  if (value === "disabled" || value === "authorized") return value;
  return "own";
}

function providerScope(value: string): CalendarProviderWriteScope {
  return value === "disabled" ? "disabled" : "calendar_events";
}

export function CalendarAdminPolicyCard({
  policy,
}: {
  policy: CalendarAdminPolicy;
}) {
  const update = useUpdateCalendarAdminPolicy();
  const revoke = useRevokeAllCalendarLinks();
  const [timeZone, setTimeZone] = useState(policy.analyticsTimeZone);
  const [minimumCohort, setMinimumCohort] = useState(
    String(policy.minimumAnalyticsCohort),
  );
  const [retentionDays, setRetentionDays] = useState(
    String(policy.analyticsRetentionDays),
  );
  const [exportMode, setExportMode] = useState<CalendarExportPolicy>(
    policy.exportPolicy,
  );
  const [providerMode, setProviderMode] = useState<CalendarProviderWriteScope>(
    policy.providerWriteScope,
  );
  const [domains, setDomains] = useState(
    policy.allowedBookingDomains.join("\n"),
  );
  const [publicLinksEnabled, setPublicLinksEnabled] = useState(
    policy.publicLinksEnabled,
  );
  const [linkExpiryDays, setLinkExpiryDays] = useState(
    String(policy.defaultLinkExpiryDays),
  );
  const [minimumCompletionSeconds, setMinimumCompletionSeconds] = useState(
    String(policy.minimumCompletionSeconds),
  );
  const [maximumSessionAttempts, setMaximumSessionAttempts] = useState(
    String(policy.maximumSessionAttempts),
  );
  const [maximumActiveLinks, setMaximumActiveLinks] = useState(
    String(policy.maximumActiveLinks),
  );
  const [offlineBusyCacheEnabled, setOfflineBusyCacheEnabled] = useState(policy.offlineBusyCacheEnabled);
  const [offlineBusyCacheMaxAgeDays, setOfflineBusyCacheMaxAgeDays] = useState(String(policy.offlineBusyCacheMaxAgeDays));

  useEffect(() => {
    setTimeZone(policy.analyticsTimeZone);
    setMinimumCohort(String(policy.minimumAnalyticsCohort));
    setRetentionDays(String(policy.analyticsRetentionDays));
    setExportMode(policy.exportPolicy);
    setProviderMode(policy.providerWriteScope);
    setDomains(policy.allowedBookingDomains.join("\n"));
    setPublicLinksEnabled(policy.publicLinksEnabled);
    setLinkExpiryDays(String(policy.defaultLinkExpiryDays));
    setMinimumCompletionSeconds(String(policy.minimumCompletionSeconds));
    setMaximumSessionAttempts(String(policy.maximumSessionAttempts));
    setMaximumActiveLinks(String(policy.maximumActiveLinks));
    setOfflineBusyCacheEnabled(policy.offlineBusyCacheEnabled);
    setOfflineBusyCacheMaxAgeDays(String(policy.offlineBusyCacheMaxAgeDays));
  }, [policy]);

  async function save() {
    const allowedBookingDomains = Array.from(
      new Set(
        domains
          .split(/[\n,]/)
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean),
      ),
    );
    try {
      await update.mutateAsync({
        expectedVersion: policy.version,
        analyticsTimeZone: timeZone.trim(),
        minimumAnalyticsCohort: Number(minimumCohort),
        analyticsRetentionDays: Number(retentionDays),
        exportPolicy: exportMode,
        providerWriteScope: providerMode,
        allowedBookingDomains,
        publicLinksEnabled,
        defaultLinkExpiryDays: Number(linkExpiryDays),
        minimumCompletionSeconds: Number(minimumCompletionSeconds),
        maximumSessionAttempts: Number(maximumSessionAttempts),
        maximumActiveLinks: Number(maximumActiveLinks),
        offlineBusyCacheEnabled,
        offlineBusyCacheMaxAgeDays: Number(offlineBusyCacheMaxAgeDays),
      });
      toast.success("Calendar governance updated");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function revokeAll() {
    try {
      const result = await revoke.mutateAsync();
      toast.success(`${result.revokedLinks} active booking links revoked`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization governance</CardTitle>
        <CardDescription>
          Organization ceilings apply to every booking page, provider write,
          export, and analytics report.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="calendar-analytics-timezone">
              Analytics timezone
            </Label>
            <Input
              id="calendar-analytics-timezone"
              value={timeZone}
              onChange={(event) => setTimeZone(event.target.value)}
              placeholder="Asia/Kolkata"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="calendar-minimum-cohort">
              Minimum private cohort
            </Label>
            <Input
              id="calendar-minimum-cohort"
              type="number"
              min={5}
              max={100}
              value={minimumCohort}
              onChange={(event) => setMinimumCohort(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="calendar-retention-days">
              Analytics retention days
            </Label>
            <Input
              id="calendar-retention-days"
              type="number"
              min={30}
              max={2555}
              value={retentionDays}
              onChange={(event) => setRetentionDays(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="calendar-export-policy">Export policy</Label>
            <Select
              value={exportMode}
              onValueChange={(value) => setExportMode(exportPolicy(value))}
            >
              <SelectTrigger id="calendar-export-policy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disabled">Disabled</SelectItem>
                <SelectItem value="own">Own and attended events</SelectItem>
                <SelectItem value="authorized">
                  All authorized events
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="calendar-provider-scope">
              Provider write scope
            </Label>
            <Select
              value={providerMode}
              onValueChange={(value) => setProviderMode(providerScope(value))}
            >
              <SelectTrigger id="calendar-provider-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disabled">Disabled</SelectItem>
                <SelectItem value="calendar_events">
                  Authorized Calendar events
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <Label htmlFor="calendar-public-links">
                Public booking links
              </Label>
              <p className="text-xs text-muted-foreground">
                Turning this off also revokes active links.
              </p>
            </div>
            <Switch
              id="calendar-public-links"
              checked={publicLinksEnabled}
              onCheckedChange={setPublicLinksEnabled}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div><Label htmlFor="calendar-offline-busy-cache">Offline busy-window cache</Label><p className="text-xs text-muted-foreground">Allows redacted, read-only busy windows on this device. Titles and record details are never stored.</p></div>
            <Switch id="calendar-offline-busy-cache" checked={offlineBusyCacheEnabled} onCheckedChange={setOfflineBusyCacheEnabled} />
          </div>
          <div className="space-y-1.5"><Label htmlFor="calendar-offline-max-age">Maximum offline cache age in days</Label><Input id="calendar-offline-max-age" type="number" min={1} max={30} value={offlineBusyCacheMaxAgeDays} onChange={(event) => setOfflineBusyCacheMaxAgeDays(event.target.value)} /></div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="calendar-booking-domains">
            Approved booking domains
          </Label>
          <Textarea
            id="calendar-booking-domains"
            value={domains}
            onChange={(event) => setDomains(event.target.value)}
            placeholder={"example.com\nbooking.example.com"}
          />
          <p className="text-xs text-muted-foreground">
            One hostname per line. An empty list allows origins already approved
            on each booking distribution.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="calendar-link-expiry">Maximum link lifetime</Label>
            <Input
              id="calendar-link-expiry"
              type="number"
              min={1}
              max={365}
              value={linkExpiryDays}
              onChange={(event) => setLinkExpiryDays(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="calendar-completion-delay">
              Minimum completion seconds
            </Label>
            <Input
              id="calendar-completion-delay"
              type="number"
              min={0}
              max={120}
              value={minimumCompletionSeconds}
              onChange={(event) =>
                setMinimumCompletionSeconds(event.target.value)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="calendar-session-attempts">
              Maximum session attempts
            </Label>
            <Input
              id="calendar-session-attempts"
              type="number"
              min={1}
              max={30}
              value={maximumSessionAttempts}
              onChange={(event) =>
                setMaximumSessionAttempts(event.target.value)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="calendar-active-links">Maximum active links</Label>
            <Input
              id="calendar-active-links"
              type="number"
              min={1}
              max={10000}
              value={maximumActiveLinks}
              onChange={(event) => setMaximumActiveLinks(event.target.value)}
            />
          </div>
        </div>
        <Alert>
          <ShieldAlert />
          <AlertTitle>Emergency link control</AlertTitle>
          <AlertDescription>
            Revocation stops new sessions. Existing bookings continue under
            their recorded lifecycle and cancellation policy.
          </AlertDescription>
        </Alert>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="destructive"
            disabled={revoke.isPending}
            onClick={() => void revokeAll()}
          >
            Revoke all active links
          </Button>
          <LoadingButton
            isPending={update.isPending}
            onClick={() => void save()}
          >
            Save governance
          </LoadingButton>
        </div>
      </CardContent>
    </Card>
  );
}
