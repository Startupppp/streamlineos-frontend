"use client";

import {
  Children,
  Fragment,
  cloneElement,
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
import {
  OVERFLOW_EDGE_FADE_CLASS,
  useHorizontalOverflow,
} from "@/hooks/common/use-horizontal-overflow";
import {
  resolveStatCardWash,
  statCardPaletteWash,
  type StatCardWash,
  type StatColor,
  type StatTone,
} from "@/components/ui/stat-card-wash";

export type { StatColor, StatTone };

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

const success = statusToneClasses("success");
const danger = statusToneClasses("danger");

interface GridTemplateStyle extends CSSProperties {
  "--stat-card-grid-template": string;
}

function gridTemplateVar(template: string): GridTemplateStyle {
  return { "--stat-card-grid-template": template };
}

function stampStatCards(node: ReactNode, counter: { n: number }): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement<{ children?: ReactNode; index?: number; label?: string }>(child)) {
      return child;
    }
    if (child.type === Fragment) {
      return cloneElement(
        child,
        undefined,
        stampStatCards(child.props.children, counter),
      );
    }
    if (typeof child.props.label !== "string") return child;
    const given = child.props.index;
    const index = typeof given === "number" ? given : counter.n;
    counter.n = Math.max(counter.n, Math.trunc(index) + 1);
    if (given === index) return child;
    return cloneElement(child, { index });
  });
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
      className="shrink-0"
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
  wrapHint?: boolean;
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
  stackOnMobile?: boolean | 2;
  minColumn?: string;
}

export interface StatCardGridSkeletonProps {
  cols?: 2 | 3 | 4 | 5 | 6;
  count?: number;
  className?: string;
  stackOnMobile?: boolean | 2;
}

export function StatCardGrid({
  children,
  cols = 4,
  className,
  stackOnMobile = false,
  minColumn = "10rem",
}: StatCardGridProps) {
  const childCount = countGridChildren(children);
  const columnCount = childCount > 0 ? childCount : cols;
  const ref = useRef<HTMLDivElement>(null);
  const overflow = useHorizontalOverflow(ref, children);
  const [hasFocusableChild, setHasFocusableChild] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    setHasFocusableChild(
      element.querySelector(
        "a[href], button, input, select, textarea, [tabindex]",
      ) !== null,
    );
  }, [children]);

  const scrollableWithoutFocus = overflow.scrolls && !hasFocusableChild;
  const template = `repeat(${columnCount}, minmax(${minColumn}, 1fr))`;

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
        stackOnMobile === true &&
          "grid-cols-1 sm:[grid-template-columns:var(--stat-card-grid-template)]",
        stackOnMobile === 2 &&
          "grid-cols-2 sm:[grid-template-columns:var(--stat-card-grid-template)]",
        className,
      )}
      style={
        stackOnMobile
          ? gridTemplateVar(template)
          : { gridTemplateColumns: template }
      }
    >
      {stampStatCards(children, { n: 0 })}
    </div>
  );
}

export function StatCardSkeleton({
  className,
  index = 0,
}: {
  className?: string;
  index?: number;
}) {
  const wash = statCardPaletteWash(index);
  return (
    <div
      data-slot="stat-card"
      className={cn(
        "relative flex h-full items-start gap-3 overflow-hidden rounded-xl border border-border/80 bg-card px-3.5 py-3 shadow-sm",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "mt-0.5 h-9 w-9 shrink-0 rounded-lg border",
          wash.surface,
          wash.rule,
        )}
      />
      <div className="relative min-w-0 flex-1 space-y-0.5">
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
  stackOnMobile,
}: StatCardGridSkeletonProps) {
  const itemCount = count ?? cols;
  return (
    <StatCardGrid
      cols={cols}
      className={className}
      stackOnMobile={stackOnMobile}
    >
      {Array.from({ length: itemCount }).map((_, i) => (
        <StatCardSkeleton key={i} index={i} />
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
  wrapHint = false,
  isLoading,
  featured,
  className,
  index,
  trend,
  subtitle,
  sparkData,
  sparkColor = "var(--primary)",
}: StatCardProps) {
  const wash: StatCardWash | null = featured
    ? null
    : resolveStatCardWash({ tone, color, index, label });
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

  return (
    <div
      data-slot="stat-card"
      data-featured={featured ? "true" : undefined}
      className={cn(
        "relative flex h-full items-start gap-3 overflow-hidden rounded-xl border bg-card px-3.5 py-3 shadow-sm",
        featured ? "border-primary bg-primary text-primary-foreground" : "border-border/80",
        className,
      )}
    >
      {Icon && (
        <div
          aria-hidden="true"
          className={cn(
            "relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
            featured
              ? "border-transparent bg-primary-foreground/15"
              : wash
                ? cn(wash.surface, wash.rule)
                : "border-transparent bg-muted",
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              featured
                ? "text-primary-foreground"
                : wash
                  ? wash.ink
                  : "text-muted-foreground",
            )}
          />
        </div>
      )}
      <div className="relative min-w-0 flex-1 space-y-0.5">
        <TruncatedTooltipText
          text={label}
          className={cn(
            "text-dense font-medium leading-tight line-clamp-2 break-words",
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
              "text-dense leading-snug",
              wrapHint ? "break-words" : "truncate",
              featured ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          />
        )}
      </div>
      {!isLoading && sparkData && sparkData.length > 1 ? (
        <span className={cn("relative", wash?.ink)}>
          <StatSparkLine
            data={sparkData}
            color={wash ? "currentColor" : sparkColor}
          />
        </span>
      ) : null}
    </div>
  );
});
