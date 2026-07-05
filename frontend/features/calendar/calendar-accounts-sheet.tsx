"use client";

import { useCallback, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { Loader2, Plus, RefreshCw, Star, Unplug } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useDisconnectIntegration,
  useInitiateIntegrationConnection,
  useIntegrationConnections,
  useSetPrimaryIntegration,
  type IntegrationConnection,
  type IntegrationToolkit,
} from "@/hooks/api/integrations";
import { accountColor } from "./calendar-account-colors";
import { useCalendarAccountFilters } from "./use-calendar-account-filters";

const TOOLKIT_LABELS: Record<IntegrationToolkit, string> = {
  googlecalendar: "Google Calendar",
  outlook: "Outlook",
};

interface CalendarAccountsSheetProps {
  open: boolean;
  onClose: () => void;
}

interface AccountRowProps {
  connection: IntegrationConnection;
  index: number;
  isHidden: boolean;
  onToggle: (connectionId: number) => void;
  onConnect: (toolkit: IntegrationToolkit) => void;
  onSetPrimary: (connectionId: number) => void;
  onDisconnect: (connection: IntegrationConnection) => void;
}

function AccountRow({
  connection,
  index,
  isHidden,
  onToggle,
  onConnect,
  onSetPrimary,
  onDisconnect,
}: AccountRowProps) {
  const handleToggleVisible = useCallback(
    () => onToggle(connection.id),
    [connection.id, onToggle],
  );
  const handleReconnect = useCallback(
    () => { void onConnect(connection.toolkit); },
    [connection.toolkit, onConnect],
  );
  const handleMakePrimary = useCallback(
    () => { void onSetPrimary(connection.id); },
    [connection.id, onSetPrimary],
  );
  const handleDisconnectClick = useCallback(
    () => { void onDisconnect(connection); },
    [connection, onDisconnect],
  );

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
      <span
        className="h-2.5 w-2.5 rounded-full shrink-0"
        style={{ backgroundColor: accountColor(index) }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          {connection.accountEmail ?? TOOLKIT_LABELS[connection.toolkit]}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {TOOLKIT_LABELS[connection.toolkit]}
          {connection.isPrimary ? " · Default" : ""}
        </p>
      </div>
      {connection.status === "needs_reauth" ? (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleReconnect}
        >
          <RefreshCw className="h-3 w-3" />
          Reconnect
        </Button>
      ) : (
        <Switch
          checked={!isHidden}
          onCheckedChange={handleToggleVisible}
          aria-label="Show events from this account"
        />
      )}
      {!connection.isPrimary && connection.status === "active" && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleMakePrimary}
          aria-label="Make default"
        >
          <Star className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleDisconnectClick}
        aria-label="Disconnect"
      >
        <Unplug className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function CalendarAccountsSheet({ open, onClose }: CalendarAccountsSheetProps) {
  const { data: connections, isLoading } = useIntegrationConnections();
  const initiate = useInitiateIntegrationConnection();
  const disconnect = useDisconnectIntegration();
  const setPrimary = useSetPrimaryIntegration();
  const { hiddenIds, toggleConnection } = useCalendarAccountFilters();
  const [pendingToolkit, setPendingToolkit] = useState<IntegrationToolkit | null>(null);

  const handleConnect = useCallback(
    async (toolkit: IntegrationToolkit) => {
      setPendingToolkit(toolkit);
      try {
        const { redirectUrl } = await initiate.mutateAsync(toolkit);
        window.location.assign(redirectUrl);
      } catch (error) {
        setPendingToolkit(null);
        toast.error(getErrorMessage(error));
      }
    },
    [initiate],
  );

  const handleConnectGoogle = useCallback(
    () => { void handleConnect("googlecalendar"); },
    [handleConnect],
  );

  const handleConnectOutlook = useCallback(
    () => { void handleConnect("outlook"); },
    [handleConnect],
  );

  const handleDisconnect = useCallback(
    async (connection: IntegrationConnection) => {
      try {
        await disconnect.mutateAsync(connection.id);
        toast.success(
          `${connection.accountEmail ?? TOOLKIT_LABELS[connection.toolkit]} disconnected`,
        );
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [disconnect],
  );

  const handleSetPrimary = useCallback(
    async (connectionId: number) => {
      try {
        await setPrimary.mutateAsync(connectionId);
        toast.success("Default account updated");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [setPrimary],
  );

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle className="text-base">Calendar accounts</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : !connections || connections.length === 0 ? (
            <EmptyState
              illustration={<EmptyCalendarIllustration className="h-24 w-24" />}
              title="No accounts connected"
              description="Connect a Google or Microsoft account to see its events here and add meeting links."
            />
          ) : (
            connections.map((connection, index) => (
              <AccountRow
                key={connection.id}
                connection={connection}
                index={index}
                isHidden={hiddenIds.includes(connection.id)}
                onToggle={toggleConnection}
                onConnect={handleConnect}
                onSetPrimary={handleSetPrimary}
                onDisconnect={handleDisconnect}
              />
            ))
          )}
        </div>
        <div className="px-5 py-3 border-t shrink-0 flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2"
            disabled={pendingToolkit !== null}
            onClick={handleConnectGoogle}
          >
            {pendingToolkit === "googlecalendar" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Connect Google Calendar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2"
            disabled={pendingToolkit !== null}
            onClick={handleConnectOutlook}
          >
            {pendingToolkit === "outlook" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Connect Microsoft Outlook
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
