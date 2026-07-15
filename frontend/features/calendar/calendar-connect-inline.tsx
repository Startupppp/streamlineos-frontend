"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useInitiateIntegrationConnection,
  type IntegrationToolkit,
} from "@/hooks/api/integrations";
import { useCan } from "@/hooks/api/access";

function GoogleGlyph() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
  );
}

function OutlookGlyph() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export function CalendarConnectInline() {
  const canManage = useCan("integrations:connections:manage");
  const initiate = useInitiateIntegrationConnection();
  const [pending, setPending] = useState<IntegrationToolkit | null>(null);

  const handleConnect = useCallback(
    async (toolkit: IntegrationToolkit) => {
      setPending(toolkit);
      try {
        const { redirectUrl } = await initiate.mutateAsync(toolkit);
        window.location.assign(redirectUrl);
      } catch (error) {
        setPending(null);
        toast.error(getErrorMessage(error));
      }
    },
    [initiate],
  );

  const handleConnectGoogle = useCallback(() => {
    void handleConnect("googlecalendar");
  }, [handleConnect]);

  const handleConnectOutlook = useCallback(() => {
    void handleConnect("outlook");
  }, [handleConnect]);

  if (!canManage) {
    return (
      <p className="text-xs text-muted-foreground">
        No calendar account connected. Ask an admin to connect one to sync
        events and add Meet/Teams links.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">
        Connect a calendar account to sync this event and auto-generate a Google
        Meet or Teams link.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={handleConnectGoogle}
          disabled={pending !== null}
        >
          {pending === "googlecalendar" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <GoogleGlyph />
          )}
          Connect Google
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={handleConnectOutlook}
          disabled={pending !== null}
        >
          {pending === "outlook" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <OutlookGlyph />
          )}
          Connect Outlook
        </Button>
      </div>
    </div>
  );
}
