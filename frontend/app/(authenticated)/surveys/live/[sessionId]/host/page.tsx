"use client";

import { useParams } from "next/navigation";
import { toast } from "sonner";
import { SkipForward, Square } from "lucide-react";
import { PlayIcon, EyeIcon, CopyIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { RequireModule } from "@/components/auth/require-module";
import { getApiError } from "@/lib/api-client";
import {
  useLiveSession,
  useLiveSessionResults,
  useStartLiveSession,
  useNextQuestion,
  useRevealResults,
  useEndLiveSession,
} from "@/hooks/api/surveys/live-session";
import { LiveResultBars } from "@/features/surveys/live/live-result-bars";

function joinUrlFor(code: string): string {
  if (typeof window === "undefined") return `/live/${code}`;
  return `${window.location.origin}/live/${code}`;
}

export default function LiveSessionHostPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = Number(params.sessionId);

  const { data: session, isLoading } = useLiveSession(sessionId);
  const { data: results } = useLiveSessionResults(sessionId);
  const start = useStartLiveSession();
  const next = useNextQuestion();
  const reveal = useRevealResults();
  const end = useEndLiveSession();

  async function run(action: typeof start, label: string) {
    try {
      await action.mutateAsync(sessionId);
    } catch (error) {
      toast.error(getApiError(error) || `Failed to ${label}`);
    }
  }

  async function handleCopyLink() {
    if (!session) return;
    await navigator.clipboard.writeText(joinUrlFor(session.sessionCode));
    toast.success("Join link copied");
  }

  return (
    <DashboardGate permission="surveys:live:host">
      <RequireModule module="SURVEYS">
        <PageWrapper title="Live session" backHref={`/surveys/${session?.surveyId ?? ""}`}>
          {isLoading || !session ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="flex flex-wrap items-center gap-4 pt-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Join code</p>
                    <p className="font-mono text-2xl font-bold tracking-widest">{session.sessionCode}</p>
                  </div>
                  <AnimatedIconButton icon={CopyIcon} iconSize={14} iconClassName="mr-1.5" variant="outline" size="sm" onClick={handleCopyLink}>
                    Copy join link
                  </AnimatedIconButton>
                  <div className="ml-auto text-sm text-muted-foreground">
                    {results?.participantCount ?? 0} joined
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex flex-wrap gap-2">
                    {session.status !== "active" && session.status !== "ended" && (
                      <AnimatedIconButton icon={PlayIcon} iconSize={14} iconClassName="mr-1.5" size="sm" onClick={() => run(start, "start")} disabled={start.isPending}>
                        Start
                      </AnimatedIconButton>
                    )}
                    {session.status === "active" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => run(next, "advance")} disabled={next.isPending}>
                          <SkipForward className="h-3.5 w-3.5" /> Next question
                        </Button>
                        <AnimatedIconButton icon={EyeIcon} iconSize={14} iconClassName="mr-1.5" size="sm" variant="outline" onClick={() => run(reveal, "reveal")} disabled={reveal.isPending}>
                          Reveal
                        </AnimatedIconButton>
                        <Button size="sm" variant="destructive" onClick={() => run(end, "end")} disabled={end.isPending}>
                          <Square className="h-3.5 w-3.5" /> End session
                        </Button>
                      </>
                    )}
                  </div>

                  {results && <LiveResultBars results={results} />}
                </CardContent>
              </Card>
            </div>
          )}
        </PageWrapper>
      </RequireModule>
    </DashboardGate>
  );
}
