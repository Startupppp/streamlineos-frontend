"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

export type CompanionActivity =
  | "idle"
  | "thinking"
  | "clarification"
  | "proposal"
  | "success"
  | "error"
  | "quiet";

export const COMPANION_ACTIVITY_LABEL: Record<CompanionActivity, string> = {
  idle: "Ready",
  thinking: "Thinking",
  clarification: "Needs your answer",
  proposal: "Action ready to review",
  success: "Done",
  error: "Something went wrong",
  quiet: "Quiet",
};

const COMPANION_CSS = `
.companion-pet{--cp-body:var(--primary);--cp-face:var(--primary-foreground);--cp-spark:var(--category-amber-fill);overflow:visible}
.companion-pet[data-preset=dusk]{--cp-body:var(--category-violet-fill);--cp-face:var(--card)}
.companion-pet[data-preset=meadow]{--cp-body:var(--category-emerald-fill);--cp-face:var(--card)}
.companion-pet[data-preset=ember]{--cp-body:var(--category-orange-fill);--cp-face:var(--card)}
.companion-pet[data-preset=mono]{--cp-body:var(--foreground);--cp-face:var(--background)}
.companion-pet[data-state=thinking],.companion-pet[data-state=clarification]{--cp-spark:var(--status-info-ink)}
.companion-pet[data-state=proposal]{--cp-spark:var(--status-warning-ink)}
.companion-pet[data-state=success]{--cp-spark:var(--status-success-ink)}
.companion-pet[data-state=error]{--cp-spark:var(--status-danger-ink)}
.companion-pet[data-state=quiet]{--cp-spark:var(--muted-foreground)}
.companion-pet .cp-body{fill:var(--cp-body)}
.companion-pet .cp-face{fill:var(--cp-face);stroke:var(--cp-face)}
.companion-pet .cp-spark{fill:var(--cp-spark)}
.companion-pet .cp-figure{transform-box:fill-box;transform-origin:50% 100%}
.companion-pet[data-state=idle] .cp-figure{animation:cp-bob 2.4s ease-in-out infinite}
.companion-pet[data-state=thinking] .cp-spark{animation:cp-pulse 1s ease-in-out infinite}
.companion-pet[data-state=success] .cp-figure{animation:cp-hop .3s ease-out 1}
.companion-pet[data-state=error] .cp-figure{animation:cp-shake .3s ease-out 1}
.companion-pet[data-paused=true] *{animation-play-state:paused}
.companion-pet[data-animation=off] *{animation:none}
@media (prefers-reduced-motion:reduce){.companion-pet *{animation:none}}
@media (forced-colors:active){.companion-pet .cp-body{fill:Canvas;stroke:CanvasText}.companion-pet .cp-face,.companion-pet .cp-spark{fill:CanvasText;stroke:CanvasText}}
@keyframes cp-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1px)}}
@keyframes cp-pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes cp-hop{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes cp-shake{0%,100%{transform:translateX(0)}33%{transform:translateX(-1px)}66%{transform:translateX(1px)}}
`;

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function pageHidden() {
  return document.visibilityState === "hidden";
}

function serverPageHidden() {
  return false;
}

function CompanionEyes({ state }: { state: CompanionActivity }) {
  if (state === "success") {
    return (
      <g className="cp-face" fill="none" strokeWidth="1.4" strokeLinecap="round">
        <path d="M11 17.5q1.5-2 3 0" />
        <path d="M18 17.5q1.5-2 3 0" />
      </g>
    );
  }
  if (state === "quiet") {
    return (
      <g className="cp-face" fill="none" strokeWidth="1.4" strokeLinecap="round">
        <path d="M11 17h3" />
        <path d="M18 17h3" />
      </g>
    );
  }
  const lift = state === "thinking" ? -1 : 0;
  const ry = state === "clarification" ? 2.4 : state === "error" ? 1.2 : 1.9;
  return (
    <g className="cp-face" strokeWidth="0">
      <ellipse cx="12.5" cy={17 + lift} rx="1.5" ry={ry} />
      <ellipse cx="19.5" cy={17 + lift} rx="1.5" ry={ry} />
    </g>
  );
}

interface CompanionCharacterProps {
  preset: string;
  state: CompanionActivity;
  animation: "subtle" | "off";
  className?: string;
}

export function CompanionCharacter({ preset, state, animation, className }: CompanionCharacterProps) {
  const hidden = useSyncExternalStore(subscribeVisibility, pageHidden, serverPageHidden);
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      data-testid="companion-character"
      data-preset={preset}
      data-state={state}
      data-animation={animation}
      data-paused={hidden ? "true" : "false"}
      className={cn("companion-pet shrink-0", className)}
    >
      <style>{COMPANION_CSS}</style>
      <g className="cp-figure">
        <path className="cp-body" d="M15.2 4.5h1.6v4h-1.6z" />
        <circle className="cp-spark" cx="16" cy="4" r="2.2" />
        <path
          className="cp-body"
          d="M16 8c6.6 0 10.5 3.6 10.5 9.6 0 5.6-3.8 8.9-10.5 8.9-2.2 0-4.1-.3-5.6-1l-3.6 2.3.9-4C6.3 22.4 5.5 20.2 5.5 17.6 5.5 11.6 9.4 8 16 8z"
        />
        <CompanionEyes state={state} />
      </g>
    </svg>
  );
}
