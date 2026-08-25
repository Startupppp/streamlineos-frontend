"use client";

import { memo, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Briefcase, Kanban, MessageSquare, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { PREVIEW_EASE } from "../lib/preview-motion";

const MODULES = [
  { id: "people", label: "People", Icon: Users },
  { id: "pipeline", label: "Pipeline", Icon: Briefcase },
  { id: "boards", label: "Boards", Icon: Kanban },
  { id: "pulse", label: "Pulse", Icon: MessageSquare },
] as const;

const DASH_BARS = [
  { label: "Workforce", pct: 78, tone: "from-brand-core to-brand-deep" },
  { label: "Pipeline", pct: 62, tone: "from-brand-core to-brand-cyan" },
  { label: "Delivery", pct: 44, tone: "from-brand-cyan to-brand-bright" },
] as const;

const ORBIT_CHIPS = [
  {
    id: "defaults",
    label: "Defaults loading",
    className: "left-[0%] top-[14%] -rotate-[7deg]",
    delay: 0.55,
    amplitude: 3.5,
    duration: 7.2,
  },
  {
    id: "roles",
    label: "Roles seeded",
    className: "right-[0%] top-[8%] rotate-[6deg]",
    delay: 0.72,
    amplitude: 2.8,
    duration: 6.4,
  },
  {
    id: "invite",
    label: "Invite when ready",
    className: "right-[2%] bottom-[6%] -rotate-[4deg]",
    delay: 0.9,
    amplitude: 3.2,
    duration: 8,
  },
] as const;

type WelcomeBootStageProps = {
  workspaceLabel: string;
  className?: string;
};

function WelcomeBootStageInner({
  workspaceLabel,
  className,
}: WelcomeBootStageProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 w-full min-w-0 items-center justify-center",
        className,
      )}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-[8%] rounded-[2.5rem] bg-gradient-to-br from-brand-bright/25 via-brand-cyan/12 to-transparent blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-[18%] top-[22%] h-40 w-40 rounded-full bg-brand-core/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-[18%] right-[14%] h-48 w-48 rounded-full bg-brand-cyan/14 blur-3xl"
        aria-hidden
      />

      <div className="relative h-full min-h-[320px] w-full max-w-[540px] xl:max-w-[600px] 2xl:max-w-[660px]">
        {ORBIT_CHIPS.map((chip) => (
          <motion.div
            key={chip.id}
            initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: reduceMotion ? 0.12 : 0.55,
              delay: reduceMotion ? 0 : chip.delay,
              ease: PREVIEW_EASE,
            }}
            className={cn("absolute z-30", chip.className)}
          >
            <FloatLayer
              reduce={reduceMotion}
              amplitude={chip.amplitude}
              duration={chip.duration}
            >
              <div className="rounded-full border border-border/80 bg-card/90 px-3 py-1.5 shadow-[0_16px_36px_-20px_rgba(30,64,175,0.35)] backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-1.5 w-1.5">
                    {!reduceMotion ? (
                      <motion.span
                        className="absolute inset-0 rounded-full bg-brand-cyan"
                        animate={{
                          opacity: [0.35, 1, 0.35],
                          scale: [1, 1.6, 1],
                        }}
                        transition={{
                          duration: 2.4,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    ) : null}
                    <span className="relative h-1.5 w-1.5 rounded-full bg-brand-core" />
                  </span>
                  <span className="text-dense font-medium tracking-tight text-foreground">
                    {chip.label}
                  </span>
                </div>
              </div>
            </FloatLayer>
          </motion.div>
        ))}

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: reduceMotion ? 0.15 : 0.65,
            delay: reduceMotion ? 0 : 0.08,
            ease: PREVIEW_EASE,
          }}
          className="absolute inset-[4%] z-10 sm:inset-[3%] lg:inset-[2%]"
        >
          <FloatLayer reduce={reduceMotion} amplitude={2} duration={9}>
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-border/80 bg-card/95 shadow-[0_32px_70px_-28px_rgba(30,64,175,0.38)] backdrop-blur-sm">
              <div className="flex items-center gap-2 border-b border-border/70 bg-gradient-to-r from-brand-core/[0.07] via-brand-cyan/[0.04] to-transparent px-3.5 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-border" />
                  <span className="h-2 w-2 rounded-full bg-border" />
                  <span className="h-2 w-2 rounded-full bg-brand-bright/70" />
                </div>
                <div className="ml-1 min-w-0 flex-1">
                  <p className="truncate font-display text-xs font-bold tracking-tight text-foreground">
                    {workspaceLabel}
                    <span className="font-sans text-dense font-medium text-muted-foreground">
                      {" "}
                      · company OS
                    </span>
                  </p>
                </div>
                <BootPulse reduceMotion={reduceMotion} />
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-[72px_minmax(0,1fr)] sm:grid-cols-[84px_minmax(0,1fr)]">
                <aside className="flex min-h-0 flex-col gap-1.5 border-r border-border/70 bg-muted/40 px-2 py-3">
                  {MODULES.map((mod, index) => (
                    <motion.div
                      key={mod.id}
                      initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: reduceMotion ? 0.12 : 0.4,
                        delay: reduceMotion ? 0 : 0.28 + index * 0.1,
                        ease: PREVIEW_EASE,
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg px-1 py-2",
                        index === 0
                          ? "bg-brand-core/10 text-brand-deep"
                          : "text-muted-foreground",
                      )}
                    >
                      <mod.Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                      <span className="text-micro font-medium tracking-tight">
                        {mod.label}
                      </span>
                      {!reduceMotion ? (
                        <motion.span
                          className="h-0.5 w-5 rounded-full bg-brand-core"
                          initial={{ scaleX: 0, opacity: 0 }}
                          animate={{
                            scaleX: index === 0 ? 1 : 0.55,
                            opacity: index === 0 ? 1 : 0.35,
                          }}
                          transition={{
                            duration: 0.45,
                            delay: 0.4 + index * 0.1,
                            ease: PREVIEW_EASE,
                          }}
                        />
                      ) : (
                        <span
                          className={cn(
                            "h-0.5 w-5 rounded-full bg-brand-core",
                            index === 0 ? "opacity-100" : "opacity-35",
                          )}
                        />
                      )}
                    </motion.div>
                  ))}
                </aside>

                <div className="flex min-h-0 min-w-0 flex-col gap-3 p-3 sm:p-4">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-micro font-medium text-brand-deep">
                        Dashboard · live
                      </p>
                      <p className="truncate font-display text-sm font-extrabold tracking-[-0.02em] text-foreground sm:text-base">
                        First day online
                      </p>
                    </div>
                    <motion.div
                      initial={
                        reduceMotion ? false : { opacity: 0, scale: 0.9 }
                      }
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.4,
                        delay: reduceMotion ? 0 : 0.5,
                        ease: PREVIEW_EASE,
                      }}
                      className="shrink-0 rounded-md border border-status-success-rule bg-status-success-surface px-2 py-0.5 text-micro font-semibold text-status-success-ink"
                    >
                      Boot OK
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {["HR", "CRM", "PM"].map((tile, index) => (
                      <motion.div
                        key={tile}
                        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: reduceMotion ? 0.12 : 0.4,
                          delay: reduceMotion ? 0 : 0.42 + index * 0.08,
                          ease: PREVIEW_EASE,
                        }}
                        className="rounded-xl border border-border/70 bg-gradient-to-br from-brand-core/[0.06] via-card to-brand-cyan/[0.04] px-2.5 py-2.5"
                      >
                        <p className="text-micro font-medium text-muted-foreground">
                          {tile}
                        </p>
                        <p className="mt-1 font-display text-sm font-extrabold tracking-tight text-foreground">
                          {index === 0
                            ? "Ready"
                            : index === 1
                              ? "Wired"
                              : "Queued"}
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  <div className="min-h-0 flex-1 space-y-2.5 rounded-xl border border-border/70 bg-muted/30 p-3">
                    {DASH_BARS.map((bar, index) => (
                      <div key={bar.label}>
                        <div className="mb-1 flex items-center justify-between text-micro">
                          <span className="font-medium text-foreground/80">
                            {bar.label}
                          </span>
                          <span className="font-mono text-muted-foreground">
                            {bar.pct}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-border/70">
                          <motion.div
                            initial={
                              reduceMotion
                                ? { width: `${bar.pct}%` }
                                : { width: 0 }
                            }
                            animate={{ width: `${bar.pct}%` }}
                            transition={{
                              duration: reduceMotion ? 0 : 0.9,
                              delay: reduceMotion ? 0 : 0.55 + index * 0.1,
                              ease: PREVIEW_EASE,
                            }}
                            className={cn(
                              "h-full rounded-full bg-gradient-to-r",
                              bar.tone,
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border/70 bg-muted/25 px-3.5 py-2">
                <p className="truncate text-dense text-muted-foreground">
                  Assembling{" "}
                  <span className="font-medium text-foreground">
                    {workspaceLabel}
                  </span>
                </p>
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((index) => (
                    <motion.span
                      key={index}
                      className="h-1 w-1 rounded-full bg-brand-core"
                      animate={
                        reduceMotion
                          ? { opacity: 0.7 }
                          : { opacity: [0.25, 1, 0.25] }
                      }
                      transition={
                        reduceMotion
                          ? undefined
                          : {
                              duration: 1.2,
                              repeat: Infinity,
                              delay: index * 0.18,
                              ease: "easeInOut",
                            }
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          </FloatLayer>
        </motion.div>
      </div>
    </div>
  );
}

function BootPulse({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-core/20 bg-brand-core/10 px-2 py-0.5">
      <span className="relative flex h-1.5 w-1.5">
        {!reduceMotion ? (
          <motion.span
            className="absolute inset-0 rounded-full bg-brand-core"
            animate={{ opacity: [0.4, 0, 0.4], scale: [1, 2.2, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : null}
        <span className="relative h-1.5 w-1.5 rounded-full bg-brand-core" />
      </span>
      <span className="text-micro font-semibold tracking-tight text-brand-deep">
        Igniting
      </span>
    </div>
  );
}

function FloatLayer({
  children,
  reduce,
  amplitude,
  duration,
}: {
  children: ReactNode;
  reduce: boolean | null;
  amplitude: number;
  duration: number;
}) {
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      animate={{ y: [-amplitude, amplitude, -amplitude] }}
      transition={{ duration, ease: "easeInOut", repeat: Infinity }}
    >
      {children}
    </motion.div>
  );
}

export const WelcomeBootStage = memo(
  WelcomeBootStageInner,
  (prev, next) =>
    prev.workspaceLabel === next.workspaceLabel &&
    prev.className === next.className,
);
