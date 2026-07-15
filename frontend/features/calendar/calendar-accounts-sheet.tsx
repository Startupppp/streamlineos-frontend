"use client";

import { memo, useCallback, useState } from "react";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { Loader2, RefreshCw, Star, Unplug } from "lucide-react";
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
import { useCan } from "@/hooks/api/access";
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
  canManage: boolean;
  onToggle: (connectionId: number) => void;
  onConnect: (toolkit: IntegrationToolkit) => void;
  onSetPrimary: (connectionId: number) => void;
  onDisconnect: (connection: IntegrationConnection) => void;
}

const AccountRow = memo(function AccountRow({
  connection,
  index,
  isHidden,
  canManage,
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
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm min-w-0">
      <span
        className="h-2.5 w-2.5 rounded-full shrink-0"
        style={{ backgroundColor: accountColor(index) }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          {connection.accountEmail ?? TOOLKIT_LABELS[connection.toolkit]}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">
          {TOOLKIT_LABELS[connection.toolkit]}
          {connection.isPrimary ? " · Default" : ""}
        </p>
      </div>
      {connection.status === "needs_reauth" ? (
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1 shrink-0"
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
      {canManage && !connection.isPrimary && connection.status === "active" && (
        <Button
          variant="ghost"
          size="icon"
          className="w-7 shrink-0"
          onClick={handleMakePrimary}
          aria-label="Make default"
        >
          <Star className="h-3.5 w-3.5" />
        </Button>
      )}
      {canManage && (
        <Button
          variant="ghost"
          size="icon"
          className="w-7 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
          onClick={handleDisconnectClick}
          aria-label="Disconnect"
        >
          <Unplug className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
});

export function CalendarAccountsSheet({ open, onClose }: CalendarAccountsSheetProps) {
  const { data: connections, isLoading, isError, refetch } = useIntegrationConnections();
  const initiate = useInitiateIntegrationConnection();
  const disconnect = useDisconnectIntegration();
  const setPrimary = useSetPrimaryIntegration();
  const { hiddenIds, toggleConnection } = useCalendarAccountFilters();
  const [pendingToolkit, setPendingToolkit] = useState<IntegrationToolkit | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<IntegrationConnection | null>(null);
  const canManage = useCan("integrations:connections:manage");

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

  const handleDisconnectRequest = useCallback(
    (connection: IntegrationConnection) => {
      setDisconnectTarget(connection);
    },
    [],
  );

  const handleDisconnectAlertOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) setDisconnectTarget(null);
  }, []);

  const handleConfirmDisconnect = useCallback(async () => {
    if (!disconnectTarget) return;
    const target = disconnectTarget;
    setDisconnectTarget(null);
    try {
      await disconnect.mutateAsync(target.id);
      toast.success(
        `${target.accountEmail ?? TOOLKIT_LABELS[target.toolkit]} disconnected`,
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [disconnect, disconnectTarget]);

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

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-lg gap-0 p-0 flex flex-col overflow-hidden">
          <SheetHeader className="px-4 py-3 border-b shrink-0">
            <SheetTitle className="text-base">Calendar accounts</SheetTitle>
          </SheetHeader>
          <SheetBody className="order-2 sm:order-3 flex flex-col px-4 py-2">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                <p className="text-sm text-muted-foreground">Failed to load accounts</p>
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  Retry
                </Button>
              </div>
            ) : !connections || connections.length === 0 ? (
              <EmptyState
                compact
                illustrationSize="sm"
                className="w-full flex-1 border-0 bg-transparent py-2 px-0"
                illustration={<EmptyCalendarIllustration className="h-20 w-20" />}
                title="No accounts connected"
                description="Connect a Google or Microsoft account to see its events here and add meeting links."
              />
            ) : (
              <div className="space-y-2">
                {connections.map((connection, index) => (
                  <AccountRow
                    key={connection.id}
                    connection={connection}
                    index={index}
                    isHidden={hiddenIds.includes(connection.id)}
                    canManage={canManage}
                    onToggle={toggleConnection}
                    onConnect={handleConnect}
                    onSetPrimary={handleSetPrimary}
                    onDisconnect={handleDisconnectRequest}
                  />
                ))}
              </div>
            )}
          </SheetBody>
          {canManage && (
            <div className="order-3 sm:order-2 px-4 py-2 border-t sm:border-t-0 sm:border-b shrink-0 flex flex-row flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-11 px-4 text-xs bg-card justify-center gap-2 min-w-[9rem]"
                disabled={pendingToolkit !== null}
                onClick={handleConnectGoogle}
              >
                {pendingToolkit === "googlecalendar" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                Google Calendar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-11 px-4 text-xs bg-card justify-center gap-2 min-w-[9rem]"
                disabled={pendingToolkit !== null}
                onClick={handleConnectOutlook}
              >
                {pendingToolkit === "outlook" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 21 21" aria-hidden="true">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                  </svg>
                )}
                Microsoft Outlook
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={disconnectTarget !== null} onOpenChange={handleDisconnectAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect account?</AlertDialogTitle>
            <AlertDialogDescription>
              {disconnectTarget
                ? `${disconnectTarget.accountEmail ?? TOOLKIT_LABELS[disconnectTarget.toolkit]} will be removed and its events will no longer appear in your calendar.`
                : "This account will be disconnected."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDisconnect}
              disabled={disconnect.isPending}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
