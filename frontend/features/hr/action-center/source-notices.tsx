"use client";

import { AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { statusToneClasses } from "@/lib/design-tokens";
import type { QueueSourceState } from "@/features/hr/action-center/use-action-center-queue";

export function SourceNotices({ sources }: { sources: QueueSourceState[] }) {
  const degraded = sources.filter((source) => source.denied || source.isError);
  if (degraded.length === 0) return null;

  return (
    <ul className="space-y-1 px-3 pt-2">
      {degraded.map((source) => (
        <SourceNotice key={source.key} source={source} />
      ))}
    </ul>
  );
}

function SourceNotice({ source }: { source: QueueSourceState }) {
  const tone = statusToneClasses(source.denied ? "neutral" : "warning");

  function handleRetry(): void {
    source.retry();
  }

  return (
    <li
      className={`flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-1.5 text-dense ${tone.surface} ${tone.ink} ${tone.rule}`}
    >
      {source.denied ? (
        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      <span className="min-w-0 flex-1">
        {source.denied
          ? `${source.label} is not shown — your role does not include ${source.permission}. Counts below exclude it.`
          : `${source.label} could not be loaded, so this queue is incomplete.`}
      </span>
      {source.isError ? (
        <Button variant="outline" size="sm" className="h-7" onClick={handleRetry}>
          Retry
        </Button>
      ) : null}
    </li>
  );
}
