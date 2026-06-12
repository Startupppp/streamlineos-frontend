"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AiFeature, AiAccent } from "./types";

const ACCENTS: Record<
  AiAccent,
  { iconBg: string; icon: string; bar: string }
> = {
  amber: { iconBg: "bg-amber-500/10", icon: "text-amber-600", bar: "bg-amber-500" },
  blue: { iconBg: "bg-blue-500/10", icon: "text-blue-600", bar: "bg-blue-500" },
  emerald: { iconBg: "bg-emerald-500/10", icon: "text-emerald-600", bar: "bg-emerald-500" },
  violet: { iconBg: "bg-violet-500/10", icon: "text-violet-600", bar: "bg-violet-500" },
  red: { iconBg: "bg-red-500/10", icon: "text-red-600", bar: "bg-red-500" },
  indigo: { iconBg: "bg-indigo-500/10", icon: "text-indigo-600", bar: "bg-indigo-500" },
  teal: { iconBg: "bg-teal-500/10", icon: "text-teal-600", bar: "bg-teal-500" },
  pink: { iconBg: "bg-pink-500/10", icon: "text-pink-600", bar: "bg-pink-500" },
  cyan: { iconBg: "bg-cyan-500/10", icon: "text-cyan-600", bar: "bg-cyan-500" },
  orange: { iconBg: "bg-orange-500/10", icon: "text-orange-600", bar: "bg-orange-500" },
  sky: { iconBg: "bg-sky-500/10", icon: "text-sky-600", bar: "bg-sky-500" },
};

interface AiFeatureCardProps {
  feature: AiFeature;
  onClick: () => void;
}

export function AiFeatureCard({ feature, onClick }: AiFeatureCardProps) {
  const Icon = feature.icon;
  const a = ACCENTS[feature.accent];

  return (
    <Card
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative h-full cursor-pointer overflow-hidden transition-all duration-200 hover:border-blue-400 hover:shadow-[0_8px_24px_-8px_rgba(59,130,246,0.22)] hover:-translate-y-0.5"
    >
      <div className={cn("absolute top-0 left-0 right-0 h-[2px]", a.bar)} />
      <CardContent className="flex items-start gap-3 pt-4">
        <div
          className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110",
            a.iconBg,
          )}
        >
          <Icon className={cn("h-4 w-4", a.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              {feature.title}
            </h3>
            <Badge
              variant="outline"
              className="text-[9px] h-4 px-1.5 shrink-0 capitalize"
            >
              {feature.category}
            </Badge>
          </div>
          <p className="text-[12px] text-muted-foreground leading-snug mt-1 line-clamp-2">
            {feature.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
