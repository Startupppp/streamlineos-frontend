"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";
import { formatDateTime } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useIssueExtensionToken,
  type ExtensionToken,
} from "@/hooks/api/hr/recruitment/sourcing-extension";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Issues the token the Chrome sourcing extension holds.
 *
 * Separate from the provider cards above it because it is not a provider: no
 * vendor is being connected and no key is being stored on our side. What is
 * being handed out is a credential for our own API, with one permission and a
 * deadline, and the copy has to say that plainly — a recruiter who reads this
 * as "connect LinkedIn" will wonder later why nothing synced.
 */
export function SourcingExtensionCard() {
  const issue = useIssueExtensionToken();
  const canIssue = useCan("settings:api-tokens:write");
  const [issued, setIssued] = useState<ExtensionToken | null>(null);

  const handleIssue = useCallback(() => {
    issue.mutate(
      { label: "Sourcing extension", expiresInHours: 72 },
      {
        onSuccess: (token) => setIssued(token),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [issue]);

  const handleCopy = useCallback(() => {
    if (!issued) return;
    navigator.clipboard
      .writeText(issued.token)
      .then(() => toast.success("Token copied"))
      .catch(() => toast.error("Could not copy. Select the value and copy it manually."));
  }, [issued]);

  const handleDismiss = useCallback(() => setIssued(null), []);

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">Chrome sourcing extension</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Save a profile you are looking at straight into Candidates, with the consent recorded.
          </p>
        </div>

        <p className="text-xs text-muted-foreground rounded-md border bg-muted/40 px-3 py-2">
          The token carries one permission — adding and updating candidates — and expires in three
          days. It cannot read offers or salaries, and it cannot issue itself a replacement.
        </p>

        {issued ? (
          <div className="space-y-2">
            <div className="rounded-lg border bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground mb-1">API address</p>
              <code className="text-xs break-all">{API_BASE_URL}</code>
            </div>
            <div className="rounded-lg border bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground mb-1">
                Sourcing token — shown once, expires {formatDateTime(issued.expiresAt)}
              </p>
              <code className="text-xs break-all">{issued.token}</code>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleCopy}>
                Copy token
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Done
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste both into the extension&apos;s Settings page. Closing this is the last time the
              token can be read; after that, issue a new one.
            </p>
          </div>
        ) : (
          /*
            Fails closed on `useCan`: a recruiter who cannot mint tokens is not
            offered a button that would 403. The copy says which permission,
            because "you cannot do this" without a name is unactionable.
          */
          <div className="space-y-2">
            <LoadingButton
              size="sm"
              onClick={handleIssue}
              isPending={issue.isPending}
              disabled={!canIssue}
            >
              Issue token
            </LoadingButton>
            {!canIssue && (
              <p className="text-xs text-muted-foreground">
                Issuing a token needs the personal API token permission on your account.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
