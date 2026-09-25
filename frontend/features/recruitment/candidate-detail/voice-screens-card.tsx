"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/date-utils";
import {
  useCandidateVoiceScreens,
  type VoiceScreenView,
} from "@/hooks/api/hr/recruitment/voice-screens";

interface Props {
  candidateId: number;
}

/**
 * Automated phone screens, and whether one actually took place.
 *
 * The card renders nothing at all when there are none and no vendor is
 * connected: an empty "Voice screens" panel on every candidate in every
 * organisation would be a permanent advertisement for a capability nobody here
 * has.
 */
export function VoiceScreensCard({ candidateId }: Props) {
  const { data, isLoading, isError } = useCandidateVoiceScreens(candidateId);

  if (isError) return null;
  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if ((data?.length ?? 0) === 0) return null;

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm">Voice screens</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        {(data ?? []).map((screen) => (
          <VoiceScreenRow key={screen.id} screen={screen} />
        ))}
      </CardContent>
    </Card>
  );
}

function VoiceScreenRow({ screen }: { screen: VoiceScreenView }) {
  return (
    <div className="rounded-md border px-3 py-2 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">
          {screen.script.length} question{screen.script.length === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2">
          {screen.rating !== null && (
            <span className="text-xs font-mono tabular-nums text-foreground">
              {screen.rating}/5
            </span>
          )}
          <Badge variant="outline" className="text-micro">
            {screen.result}
          </Badge>
        </div>
      </div>

      {/*
        The distinction the whole feature rests on. A screen that was requested
        and never happened must not read like one that did, so the absence of a
        completion says so in words rather than being left to the status badge.
      */}
      <p className="text-xs text-muted-foreground">
        {screen.completedBy === "PROVIDER"
          ? `Completed by the screening vendor · ${screen.answers.length} answers recorded`
          : screen.completedBy === "RECRUITER"
            ? "Run by a recruiter"
            : "Requested — nobody has spoken to this candidate yet."}
      </p>
      <p className="text-xs text-muted-foreground">
        Requested {formatDateTime(screen.requestedAt)}
      </p>
    </div>
  );
}
