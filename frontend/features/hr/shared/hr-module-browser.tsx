"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowRight, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  HR_CATEGORIES,
  HR_MODULES,
  searchModules,
  type HrModuleCategoryId,
  type HrModuleDef,
  type HrModuleTone,
} from "./hr-modules";
import { HrSectionHeader } from "./hr-ui";

const TONE_STYLES: Record<
  HrModuleTone,
  { well: string; ring: string }
> = {
  blue: {
    well: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    ring: "group-hover:border-blue-500/30",
  },
  emerald: {
    well: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    ring: "group-hover:border-emerald-500/30",
  },
  amber: {
    well: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    ring: "group-hover:border-amber-500/30",
  },
  rose: {
    well: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
    ring: "group-hover:border-rose-500/30",
  },
  violet: {
    well: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    ring: "group-hover:border-blue-500/30",
  },
  sky: {
    well: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    ring: "group-hover:border-sky-500/30",
  },
  slate: {
    well: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    ring: "group-hover:border-slate-400/30",
  },
};

function ModuleCard({ mod }: { mod: HrModuleDef }) {
  const Icon = mod.icon;
  const tone = TONE_STYLES[mod.tone];

  return (
    <Link
      href={mod.href}
      className={cn(
        "group relative flex flex-col gap-2.5 rounded-2xl border border-border/70 bg-card/90 p-3.5 sm:p-4",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-16px_rgba(15,23,42,0.28)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        tone.ring,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            tone.well,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{mod.label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug line-clamp-2">
          {mod.description}
        </p>
      </div>
    </Link>
  );
}

export function HrModuleBrowser({
  className,
  defaultCategory = "all",
  compact = false,
}: {
  className?: string;
  defaultCategory?: HrModuleCategoryId | "all";
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<HrModuleCategoryId | "all">(defaultCategory);

  const filtered = useMemo(() => {
    let list = query ? searchModules(query) : HR_MODULES;
    // Hide hub self-link when browsing from hub
    list = list.filter((m) => m.id !== "hub");
    if (category !== "all") list = list.filter((m) => m.category === category);
    return list;
  }, [query, category]);

  const grouped = useMemo(() => {
    if (query || category !== "all") return null;
    return HR_CATEGORIES.map((cat) => ({
      ...cat,
      modules: HR_MODULES.filter((m) => m.category === cat.id && m.id !== "hub"),
    })).filter((g) => g.modules.length > 0);
  }, [query, category]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <HrSectionHeader
          title="All HR modules"
          description={`${HR_MODULES.length - 1} surfaces · search or filter by category`}
          className="mb-0"
        />
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules…"
            className="h-9 pl-8 text-xs rounded-xl"
            aria-label="Search HR modules"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={cn(
            "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-medium border transition-colors",
            category === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:text-foreground",
          )}
        >
          <LayoutGrid className="h-3 w-3" />
          All
        </button>
        {HR_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={cn(
              "inline-flex items-center h-7 px-2.5 rounded-full text-[11px] font-medium border transition-colors",
              category === cat.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {grouped ? (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.id} className="space-y-2.5">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </h3>
                {!compact && (
                  <p className="text-[11px] text-muted-foreground/80">{group.description}</p>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
                {group.modules.map((mod) => (
                  <ModuleCard key={mod.id} mod={mod} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center">
          <p className="text-sm font-medium text-foreground">No modules match</p>
          <p className="text-xs text-muted-foreground mt-1">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
          {filtered.map((mod) => (
            <ModuleCard key={mod.id} mod={mod} />
          ))}
        </div>
      )}
    </div>
  );
}
