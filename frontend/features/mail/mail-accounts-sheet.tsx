"use client";

import { memo, useCallback, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { RefreshCw, Unplug } from "lucide-react";
import { StarIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useInitiateIntegrationConnection,
  useIntegrationConnections,
  useDisconnectIntegration,
  useSetPrimaryIntegration,
  type IntegrationConnection,
  type IntegrationToolkit,
} from "@/hooks/api/integrations";
import { useCan } from "@/hooks/api/access";
import { useIsMobile } from "@/hooks/common/use-mobile";

const TOOLKIT_LABELS: Record<string, string> = {
  gmail: "Gmail",
  outlook: "Microsoft Outlook",
  googlecalendar: "Google Calendar",
};

interface MailAccountsSheetProps {
  open: boolean;
  onClose: () => void;
}

interface AccountRowProps {
  connection: IntegrationConnection;
  canManage: boolean;
  onConnect: (toolkit: IntegrationToolkit) => void;
  onSetPrimary: (connectionId: number) => void;
  onDisconnect: (connection: IntegrationConnection) => void;
}

const MAIL_TOOLKITS: IntegrationToolkit[] = ["gmail", "outlook"];

function isMailToolkit(toolkit: IntegrationToolkit): boolean {
  return MAIL_TOOLKITS.includes(toolkit);
}

const AccountRow = memo(function AccountRow({
  connection,
  canManage,
  onConnect,
  onSetPrimary,
  onDisconnect,
}: AccountRowProps) {
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

  const statusVariant =
    connection.status === "active"
      ? "secondary"
      : connection.status === "needs_reauth"
        ? "destructive"
        : "outline";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm min-w-0">
      <div className="min-w-0 flex-1">
        <TruncatedText
          text={connection.accountEmail ?? TOOLKIT_LABELS[connection.toolkit] ?? connection.toolkit}
          className="text-sm font-medium"
        />
        <div className="flex items-center gap-1.5 mt-0.5">
          <TruncatedText
            text={TOOLKIT_LABELS[connection.toolkit] ?? connection.toolkit}
            className="text-dense text-muted-foreground"
          />
          {connection.isPrimary && (
            <Badge variant="outline" className="text-micro h-4 px-1 py-0">
              Default
            </Badge>
          )}
        </div>
      </div>
      <Badge variant={statusVariant} className="text-micro shrink-0">
        {connection.status === "active"
          ? "Connected"
          : connection.status === "needs_reauth"
            ? "Reconnect"
            : "Disabled"}
      </Badge>
      {connection.status === "needs_reauth" && (
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1 shrink-0"
          onClick={handleReconnect}
        >
          <RefreshCw className="h-3 w-3" />
          Reconnect
        </Button>
      )}
      {canManage && !connection.isPrimary && connection.status === "active" && (
        <AnimatedIconButton
          icon={StarIcon}
          iconSize={14}
          variant="ghost"
          size="icon"
          className="w-7 shrink-0"
          onClick={handleMakePrimary}
          aria-label="Make default"
        />
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

export function MailAccountsSheet({ open, onClose }: MailAccountsSheetProps) {
  const { data: allConnections, isLoading, isError, refetch } = useIntegrationConnections();
  const connections = allConnections?.filter((c) => isMailToolkit(c.toolkit));
  const initiate = useInitiateIntegrationConnection();
  const disconnect = useDisconnectIntegration();
  const setPrimary = useSetPrimaryIntegration();
  const canManage = useCan("integrations:connections:manage");
  const isMobile = useIsMobile();
  const [pendingToolkit, setPendingToolkit] = useState<IntegrationToolkit | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<IntegrationConnection | null>(null);

  const handleConnect = useCallback(
    async (toolkit: IntegrationToolkit) => {
      setPendingToolkit(toolkit);
      try {
        const { redirectUrl } = await initiate.mutateAsync({ toolkit, returnPath: "/mail" });
        window.location.assign(redirectUrl);
      } catch (error) {
        setPendingToolkit(null);
        toast.error(getErrorMessage(error));
      }
    },
    [initiate],
  );

  const handleConnectGmail = useCallback(
    () => { void handleConnect("gmail"); },
    [handleConnect],
  );

  const handleConnectOutlook = useCallback(
    () => { void handleConnect("outlook"); },
    [handleConnect],
  );

  const handleDisconnectRequest = useCallback(
    (connection: IntegrationConnection) => setDisconnectTarget(connection),
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
        `${target.accountEmail ?? TOOLKIT_LABELS[target.toolkit] ?? target.toolkit} disconnected`,
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

  const accountsContent = isLoading ? (
    <div className="space-y-2">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  ) : isError ? (
    <ErrorState compact title="Failed to load accounts" onRetry={handleRetry} />
  ) : !connections || connections.length === 0 ? (
    <EmptyState
      compact
      illustrationPreset="mail"
      illustrationSize="sm"
      className="w-full flex-1 border-0 bg-transparent py-2 px-0"
      title="No mail accounts connected"
      description="Connect a Gmail or Outlook account to manage your email here."
    />
  ) : (
    <div className="space-y-2">
      {connections.map((connection) => (
        <AccountRow
          key={connection.id}
          connection={connection}
          canManage={canManage}
          onConnect={handleConnect}
          onSetPrimary={handleSetPrimary}
          onDisconnect={handleDisconnectRequest}
        />
      ))}
    </div>
  );

  const connectActions = canManage ? (
    <div className="px-4 py-3 border-t shrink-0 flex flex-row flex-wrap gap-2">
      <LoadingButton
        variant="outline"
        size="sm"
        className="flex-1 h-11 px-4 text-xs bg-card justify-center gap-2 min-w-[9rem]"
        disabled={pendingToolkit !== null && pendingToolkit !== "gmail"}
        isPending={pendingToolkit === "gmail"}
        onClick={handleConnectGmail}
      >
        {pendingToolkit !== "gmail" && (
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        )}
        Connect Gmail
      </LoadingButton>
      <LoadingButton
        variant="outline"
        size="sm"
        className="flex-1 h-11 px-4 text-xs bg-card justify-center gap-2 min-w-[9rem]"
        disabled={pendingToolkit !== null && pendingToolkit !== "outlook"}
        isPending={pendingToolkit === "outlook"}
        onClick={handleConnectOutlook}
      >
        {pendingToolkit !== "outlook" && (
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 21 21" aria-hidden="true">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
        )}
        Connect Outlook
      </LoadingButton>
    </div>
  ) : null;

  return (
    <>
      {isMobile ? (
        <Drawer open={open} onOpenChange={onClose} direction="bottom">
          <DrawerContent
            aria-describedby={undefined}
            className="w-full max-h-[92dvh] gap-0 p-0 pb-[env(safe-area-inset-bottom)] overflow-hidden bg-card"
          >
            <DrawerHeader className="px-4 py-3 border-b shrink-0">
              <DrawerTitle className="text-base">Mail accounts</DrawerTitle>
            </DrawerHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {accountsContent}
            </div>
            {connectActions}
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={open} onOpenChange={onClose}>
          <SheetContent
            side="right"
            aria-describedby={undefined}
            className="w-full sm:max-w-lg gap-0 p-0 flex flex-col overflow-hidden"
          >
            <SheetHeader className="px-4 py-3 border-b shrink-0">
              <SheetTitle className="text-base">Mail accounts</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
              {accountsContent}
            </div>
            {connectActions}
          </SheetContent>
        </Sheet>
      )}

      <AlertDialog open={disconnectTarget !== null} onOpenChange={handleDisconnectAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect account?</AlertDialogTitle>
            <AlertDialogDescription>
              {disconnectTarget
                ? `${disconnectTarget.accountEmail ?? TOOLKIT_LABELS[disconnectTarget.toolkit] ?? disconnectTarget.toolkit} will be disconnected.`
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
