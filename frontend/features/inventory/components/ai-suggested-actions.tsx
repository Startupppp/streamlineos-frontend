"use client";

import Link from "next/link";
import { useCan } from "@/hooks/api/access";
import type { ResolvedAiAction } from "@/hooks/api/inv-ai-explain";

function ActionRow({ action, index }: { action: ResolvedAiAction; index: number }) {
  const allowed = useCan(action.permission);
  if (!allowed) return null;

  const marker = (
    <span className="shrink-0 mt-0.5 h-3.5 w-3.5 rounded-full border border-primary/30 bg-primary/5 flex items-center justify-center text-micro font-bold text-primary">
      {index + 1}
    </span>
  );

  return (
    <li className="flex items-start gap-1.5 text-dense text-muted-foreground">
      {marker}
      <span>
        {action.href ? (
          <Link href={action.href} className="text-primary hover:underline">
            {action.label}
          </Link>
        ) : (
          <span className="font-medium text-foreground">{action.label}</span>
        )}
        {action.rationale ? <span> — {action.rationale}</span> : null}
      </span>
    </li>
  );
}

export function AiSuggestedActions({ actions }: { actions: ResolvedAiAction[] }) {
  if (actions.length === 0) return null;
  return (
    <div>
      <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
        Suggested Actions
      </p>
      <ul className="space-y-1">
        {actions.map((action, i) => (
          <ActionRow key={`${action.action}-${i}`} action={action} index={i} />
        ))}
      </ul>
    </div>
  );
}
