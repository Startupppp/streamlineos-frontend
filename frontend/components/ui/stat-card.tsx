"use client";

import Link from "next/link";
import {
  Children,
  Fragment,
  isValidElement,
  memo,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { OVERFLOW_EDGE_FADE_CLASS, useHorizontalOverflow } from "@/hooks/common/use-horizontal-overflow";

function countGridChildren(node: ReactNode): number {
  let count = 0;
  Children.forEach(node, (child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return;
    if (child.type === Fragment) {
      count += countGridChildren(child.props.children);
      return;
    }
    count += 1;
  });
  return count;
}

export type StatTone =
  | "default"
  | "accent"
  | "emerald"
  | "amber"
  | "red"
  | "blue"
  | "violet";

export type StatColor = StatTone | "cyan" | "green" | "gold" | "purple";

const success = statusToneClasses("success");
const warning = statusToneClasses("warning");
const danger = statusToneClasses("danger");

const TONE_MAP: Record<StatTone, { bg: string; text: string }> = {
  default: { bg: "bg-muted", text: "text-muted-foreground" },
  accent: { bg: "bg-primary/10", text: "text-primary" },
  blue: { bg: "bg-primary/10", text: "text-primary" },
  violet: { bg: "bg-primary/10", text: "text-primary" },
  emerald: { bg: success.surface, text: success.ink },
  amber: { bg: warning.surface, text: warning.ink },
  red: { bg: danger.surface, text: danger.ink },
};

const COLOR_TONE: Partial<Record<StatColor, StatTone>> = {
  cyan: "accent",
  green: "emerald",
  gold: "amber",
  purple: "accent",
};

interface GridTemplateStyle extends CSSProperties {
  "--stat-card-grid-template": string;
}

function gridTemplateVar(template: string): GridTemplateStyle {
  return { "--stat-card-grid-template": template };
}

function isStatTone(color: StatColor): color is StatTone {
  return color in TONE_MAP;
}

function resolveTone(tone?: StatTone, color?: StatColor): StatTone {
  if (tone) return tone;
  if (!color) return "default";
  if (isStatTone(color)) return color;
  return COLOR_TONE[color] ?? "default";
}

function StatSparkLine({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 28;
  const w = 60;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={w}
      height={h}
      className="shrink-0 text-primary"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
}

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ComponentType<{ className?: string }>;
  tone?: StatTone;
  color?: StatColor;
  delta?: { value: string; direction: "up" | "down" };
  hint?: string;
  href?: string;
  isLoading?: boolean;
  featured?: boolean;
  className?: string;
  index?: number;
  trend?: { value: number; isPositive: boolean; label?: string };
  subtitle?: string;
  sparkData?: number[];
  sparkColor?: string;
}

export interface StatCardGridProps {
  children: ReactNode;
  cols?: 2 | 3 | 4 | 5 | 6;
  className?: string;
  /**
   * Stack the cards in one column below `sm` instead of scrolling them.
   *
   * The row scrolls at every width by default (see below), which on a 390px
   * screen puts the third card off screen behind a hidden scrollbar. Opt in
   * where the cards are the page's headline numbers and none of them may be
   * missed — a scroll a reader does not know to make is a card they never see.
   */
  stackOnMobile?: boolean;
}

export interface StatCardGridSkeletonProps {
  cols?: 2 | 3 | 4 | 5 | 6;
  count?: number;
  className?: string;
}

/**
 * The stats row scrolls horizontally at every breakpoint by design, and a
 * `StatCard` with no `href` renders nothing focusable — so a keyboard user
 * could not scroll it at all and never saw the cards past the fold. That is
 * WCAG 2.1.1, and axe reported `scrollable-region-focusable` on it across five
 * routes.
 *
 * The fix axe asks for is a bare `tabIndex={0}`, and taken literally it puts a
 * tab stop on nearly every list page in the product whether or not the row
 * overflows — a cost paid on every page for a problem that only exists on some
 * of them. So the tab stop follows the actual overflow: measured on mount and
 * on every resize, the row is tabbable exactly when there is something off
 * screen to reach, and disappears from the tab order when all the cards fit.
 * A row that carries links is already reachable through them and stays out of
 * the tab order either way.
 *
 * The stop is a labelled `group` rather than an anonymous `div`, because
 * landing on an unnamed tab stop tells a screen-reader user nothing about why
 * focus stopped there.
 */
export function StatCardGrid({
  children,
  cols = 4,
  className,
  stackOnMobile = false,
}: StatCardGridProps) {
  const childCount = countGridChildren(children);
  const columnCount = childCount > 0 ? childCount : cols;
  const ref = useRef<HTMLDivElement>(null);
  const overflow = useHorizontalOverflow(ref, children);
  const [hasFocusableChild, setHasFocusableChild] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    setHasFocusableChild(element.querySelector("a[href], button, input, select, textarea, [tabindex]") !== null);
  }, [children]);

  const scrollableWithoutFocus = overflow.scrolls && !hasFocusableChild;
  const template = `repeat(${columnCount}, minmax(10rem, 1fr))`;

  return (
    <div
      ref={ref}
      data-slot="stat-card-grid"
      data-hidden-left={overflow.hiddenLeft}
      data-hidden-right={overflow.hiddenRight}
      {...(scrollableWithoutFocus
        ? { tabIndex: 0, role: "group", "aria-label": "Summary statistics" }
        : {})}
      className={cn(
        "grid w-full min-w-0 shrink-0 gap-3",
        "overflow-x-auto scrollbar-hide touch-pan-x snap-x snap-mandatory md:snap-none",
        "[&>*]:min-w-0 [&>*]:h-full [&>*]:snap-start",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        OVERFLOW_EDGE_FADE_CLASS,
        // The template has to reach the element as a class, not as an inline
        // style, or the `sm:` breakpoint below could never win against it.
        stackOnMobile &&
          "grid-cols-1 sm:[grid-template-columns:var(--stat-card-grid-template)]",
        className,
      )}
      style={
        stackOnMobile
          ? gridTemplateVar(template)
          : { gridTemplateColumns: template }
      }
    >
      {children}
    </div>
  );
}

/**
 * Mirrors `StatCard`'s box exactly — same padding, radius, gap, icon well and
 * two 20px text lines — so the swap from skeleton to card moves nothing. The
 * previous shape was 8px shorter, which pushed every row below the stat grid
 * down the moment the data landed.
 */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full items-start gap-3 rounded-xl border border-border/80 bg-card px-3.5 py-3 shadow-sm",
        className,
      )}
    >
      <Skeleton className="mt-0.5 h-9 w-9 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-12" />
      </div>
    </div>
  );
}

export function StatCardGridSkeleton({
  cols = 4,
  count,
  className,
}: StatCardGridSkeletonProps) {
  const itemCount = count ?? cols;
  return (
    <StatCardGrid cols={cols} className={className}>
      {Array.from({ length: itemCount }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </StatCardGrid>
  );
}

function TruncatedTooltipText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <p className={className}>{text}</p>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const StatCard = memo(function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  color,
  delta,
  hint,
  href,
  isLoading,
  featured,
  className,
  index: _index,
  trend,
  subtitle,
  sparkData,
  sparkColor = "var(--primary)",
}: StatCardProps) {
  const t = TONE_MAP[resolveTone(tone, color)];
  const effectiveHint = hint ?? subtitle;

  const effectiveDelta:
    | { value: string; direction: "up" | "down" }
    | undefined =
    delta ??
    (trend
      ? {
          value: `${Math.abs(trend.value)}%${trend.label ? ` ${trend.label}` : ""}`,
          direction: trend.isPositive ? "up" : "down",
        }
      : undefined);

  const body = (
    <div
      className={cn(
        "flex h-full items-start gap-3 rounded-xl border border-border/80 bg-card px-3.5 py-3 shadow-sm transition-colors",
        featured && "border-primary bg-primary text-primary-foreground",
        href && "hover:bg-muted/30 cursor-pointer",
        featured && href && "hover:bg-primary/90",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            featured ? "bg-primary-foreground/15" : t.bg,
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              featured ? "text-primary-foreground" : t.text,
            )}
          />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-0.5">
        <TruncatedTooltipText
          text={label}
          className={cn(
            "text-dense font-medium leading-tight truncate",
            featured ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        />
        {isLoading ? (
          <Skeleton
            className={cn("h-5 w-14", featured && "bg-primary-foreground/20")}
          />
        ) : (
          <p
            className={cn(
              "text-xl font-semibold tabular-nums leading-none tracking-tight",
              featured ? "text-primary-foreground" : "text-foreground",
            )}
          >
            {value}
          </p>
        )}
        {!isLoading && effectiveDelta && (
          <p
            className={cn(
              "text-dense font-medium",
              effectiveDelta.direction === "up" ? success.ink : danger.ink,
            )}
          >
            {effectiveDelta.direction === "up" ? "↑" : "↓"}{" "}
            {effectiveDelta.value}
          </p>
        )}
        {!isLoading && !effectiveDelta && effectiveHint && (
          <TruncatedTooltipText
            text={effectiveHint}
            className={cn(
              "text-dense leading-snug truncate",
              featured ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          />
        )}
      </div>
      {!isLoading && sparkData && sparkData.length > 1 ? (
        <StatSparkLine data={sparkData} color={sparkColor} />
      ) : null}
    </div>
  );

  if (href) return <Link href={href}>{body}</Link>;
  return body;
});
