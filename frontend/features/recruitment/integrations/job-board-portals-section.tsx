"use client";

import { useCallback, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Linkedin,
  Globe,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { RequireModule } from "@/components/auth/require-module";

import {
  useSourcePortals,
  useUpsertSourcePortal,
  type SourcePortal,
  type UpsertPortalInput,
} from "@/hooks/api/hr/recruitment/jobs";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { NoPermissionState } from "@/components/shared/no-permission-state";

interface PlatformConfig {
  id: UpsertPortalInput["platform"];
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: "LINKEDIN",
    label: "LinkedIn Talent Solutions",
    description: "Receive applications from LinkedIn job postings via webhook.",
    icon: Linkedin,
  },
  {
    id: "NAUKRI",
    label: "Naukri.com",
    description: "Sync applications from Naukri job postings.",
    icon: Globe,
  },
  {
    id: "INDEED",
    label: "Indeed",
    description: "Receive inbound applications from Indeed Apply.",
    icon: Search,
  },
];

function PortalCard({
  config,
  portal,
}: {
  config: PlatformConfig;
  portal: SourcePortal | undefined;
}) {
  const upsert = useUpsertSourcePortal();
  const canManage = useCan("hr:requisitions:manage");
  const [toggling, setToggling] = useState(false);

  const Icon = config.icon;
  const connected = portal?.isActive ?? false;

  const handleToggle = useCallback(
    async (active: boolean) => {
      setToggling(true);
      try {
        await upsert.mutateAsync({ platform: config.id, isActive: active });
        toast.success(active ? `${config.label} enabled` : `${config.label} disabled`);
      } catch (e) {
        toast.error(getErrorMessage(e));
      } finally {
        setToggling(false);
      }
    },
    [config.id, config.label, upsert],
  );

  return (
    <Card className={connected ? "border-primary/30" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Icon className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-sm">{config.label}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{config.description}</CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              connected
                ? "bg-status-success-surface text-status-success-ink border-status-success-rule text-dense"
                : "bg-muted text-muted-foreground border-border text-dense"
            }
          >
            {connected ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Inactive
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {portal && (
          <div className="text-xs text-muted-foreground space-y-1">
            {portal.lastSyncedAt && (
              <div className="flex items-center gap-1.5">
                <RefreshCw className="h-3 w-3" />
                Last sync: {format(new Date(portal.lastSyncedAt), "PPp")}
                {portal.lastSyncCount != null && (
                  <span>({portal.lastSyncCount} candidates)</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <Label htmlFor={`toggle-${config.id}`} className="text-sm cursor-pointer">
            {connected ? "Disable integration" : "Enable integration"}
          </Label>
          <Switch
            id={`toggle-${config.id}`}
            checked={connected}
            onCheckedChange={handleToggle}
            disabled={!canManage || toggling || upsert.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/** Job boards the ATS pulls applications from. Rendered on the Recruitment OS integrations page. */
export function JobBoardPortalsSection() {
  const { data: portals, isLoading, isError, error, refetch, access } = useSourcePortals();

  const portalByPlatform = useCallback(
    (platform: string) => portals?.find((p) => p.platform === platform),
    [portals],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <RequireModule module="hr">
      {access.denied ? (
        // FE-47: a disabled read would render every board as "Inactive".
        <NoPermissionState permission="hr:requisitions:manage" compact />
      ) : isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load recruitment integrations"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border border-status-info-rule bg-status-info-surface p-4 text-sm text-status-info-ink">
            <strong>How it works:</strong> Enabled boards are pulled into the ATS using the
            board credentials configured for your organisation. Each card shows when it last
            synced and how many candidates it fetched.
          </div>

          {isLoading || access.pending ? (
            <div className="space-y-4">
              {PLATFORMS.map((p) => (
                <Skeleton key={p.id} className="h-48 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {PLATFORMS.map((config) => (
                <PortalCard
                  key={config.id}
                  config={config}
                  portal={portalByPlatform(config.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </RequireModule>
  );
}
