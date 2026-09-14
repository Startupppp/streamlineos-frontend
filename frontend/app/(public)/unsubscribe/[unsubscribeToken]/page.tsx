"use client";

import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, MailX } from "lucide-react";
import { usePublicUnsubscribe } from "@/hooks/api/crm/consent";
import { getErrorMessage } from "@/lib/get-error-message";

/**
 * Where the "Unsubscribe" link in a CRM marketing email lands.
 *
 * It used to land on the API route, which answers `{"success":true}` because
 * its other two verbs exist for mail clients. The withdrawal was recorded and
 * the person was shown a line of JSON — an unsubscribe that works and does not
 * look like it worked is, to the recipient, an unsubscribe that did not work,
 * and the next thing they reach for is the spam button.
 *
 * The button, rather than acting on load: a GET is not a promise of intent.
 * Link scanners, corporate URL-rewriters and mail-client previews all fetch
 * links in delivered mail, so anything that opts a person out on page load opts
 * out people who never clicked. The click is the consent signal, and the POST
 * behind it is the only thing that records anything.
 */
export default function UnsubscribePage() {
  const params = useParams<{ unsubscribeToken: string }>();
  const unsubscribeToken = params.unsubscribeToken;
  const unsubscribe = usePublicUnsubscribe(unsubscribeToken);
  const done = unsubscribe.isSuccess;

  function handleUnsubscribe() {
    unsubscribe.mutate();
  }

  return (
    <main className="min-h-dvh surface-soft flex items-start justify-center pt-8 sm:pt-12 px-4">
      <div className="w-full max-w-md">
        <div className="gradient-brand text-white rounded-t-2xl px-6 py-8 text-center shadow-noir">
          <h1 className="text-2xl font-bold tracking-tight">
            {done ? "You're unsubscribed" : "Unsubscribe"}
          </h1>
        </div>

        <Card className="rounded-t-none border-t-0 px-6 py-6 shadow-noir">
          {done ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-16 h-16 rounded-full bg-status-success-surface mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-status-success-ink" />
              </div>
              <p className="text-lg font-semibold text-foreground">Preference saved</p>
              <p className="text-sm text-muted-foreground">
                You will not receive further marketing email from this sender. Messages you
                asked for directly — a reply, a document to sign, an invoice — are not
                marketing and will still reach you.
              </p>
              <p className="text-sm text-muted-foreground">
                Changed your mind? Reply to any earlier message and ask to be added back.
              </p>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                <MailX className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-foreground text-center">
                Stop receiving marketing email from this sender at the address this message
                was sent to?
              </p>

              {unsubscribe.isError && (
                <p className="text-sm text-destructive text-center" role="alert">
                  {getErrorMessage(unsubscribe.error) ||
                    "We could not save that just now. Please try again."}
                </p>
              )}

              <Button
                onClick={handleUnsubscribe}
                disabled={unsubscribe.isPending || !unsubscribeToken}
                className="w-full h-11"
              >
                {unsubscribe.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Unsubscribe"
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Nothing is recorded until you press the button.
              </p>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
