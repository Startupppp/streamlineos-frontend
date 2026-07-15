"use client";

import { useState, useCallback, useMemo } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { useFindExpert, useHrDepartments, type ExpertResult } from "@/hooks/api/hr";
import { Search, X } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import Link from "next/link";

const PROFICIENCY_LABELS: Record<number, string> = {
  1: "Beginner",
  2: "Elementary",
  3: "Intermediate",
  4: "Advanced",
  5: "Expert",
};

const PROFICIENCY_COLORS: Record<number, string> = {
  1: "bg-muted text-muted-foreground dark:bg-slate-900/30 dark:text-slate-400",
  2: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  3: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  4: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  5: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const ROLES = [
  "ENGINEERING", "DESIGN", "PRODUCT", "MARKETING", "SALES",
  "HR", "FINANCE", "OPERATIONS", "LEGAL", "SUPPORT",
];

export default function FindExpertPage() {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState<string>("__all__");
  const [role, setRole] = useState<string>("__all__");
  const [activeParams, setActiveParams] = useState({ skill: "", department: "", role: "" });

  const { data: departments } = useHrDepartments();

  const { data: experts, isLoading } = useFindExpert({
    skill: activeParams.skill,
    department: activeParams.department || undefined,
    role: activeParams.role || undefined,
  });

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setActiveParams({
      skill: query.trim(),
      department: department === "__all__" ? "" : department,
      role: role === "__all__" ? "" : role,
    });
  }, [query, department, role]);

  const handleClearFilters = useCallback(() => {
    setDepartment("__all__");
    setRole("__all__");
  }, []);

  const hasActiveFilters = department !== "__all__" || role !== "__all__";

  const groupedByMatchedSkill = useMemo((): Map<string, ExpertResult[]> => {
    if (!experts || experts.length === 0) return new Map<string, ExpertResult[]>();
    const groups = new Map<string, ExpertResult[]>();
    for (const expert of experts) {
      const key = expert.matchedSkill.toLowerCase().replace(/[.\s-]+/g, "");
      const existing = groups.get(key);
      if (existing) {
        existing.push(expert);
      } else {
        groups.set(key, [expert]);
      }
    }
    return groups;
  }, [experts]);

  const skillGroupNames = useMemo(() => {
    const nameMap = new Map<string, string>();
    if (!experts) return nameMap;
    for (const expert of experts) {
      const key = expert.matchedSkill.toLowerCase().replace(/[.\s-]+/g, "");
      if (!nameMap.has(key)) nameMap.set(key, expert.matchedSkill);
    }
    return nameMap;
  }, [experts]);

  const hasMultipleGroups = groupedByMatchedSkill.size > 1;

  return (
    <PageWrapper
      title="Find Expert"
      subtitle="Search across the org to find colleagues with specific skills"
    >
      <div className="space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
          <SearchInput
            value={query}
            onValueChange={handleQueryChange}
            placeholder="e.g. React, Financial Modelling, Python…"
            className="flex-1"
            aria-label="Skill search"
          />
          <Button type="submit" disabled={!query.trim()}>
            <Search className="h-4 w-4 mr-1.5" />
            Search
          </Button>
        </form>

        <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              <SelectItem value="__all__">All Departments</SelectItem>
              {(departments ?? []).map((d) => (
                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              <SelectItem value="__all__">All Roles</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button size="sm" variant="ghost" className="text-xs" onClick={handleClearFilters}>
              <X className="h-3 w-3 mr-1" />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6">
        {!activeParams.skill ? (
          <EmptyState
            illustration={<EmptyPersonIllustration className="h-40 w-40" />}
            title="Search for a skill"
            description="Enter a skill name above to find colleagues who can help."
          />
        ) : isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        ) : !experts || experts.length === 0 ? (
          <EmptyState
            illustration={<EmptyPersonIllustration className="h-40 w-40" />}
            title={`No experts found for "${activeParams.skill}"`}
            description="Try a different skill or a broader search term."
          />
        ) : (
          <div className="space-y-6">
            {hasMultipleGroups && (
              <p className="text-xs text-muted-foreground">
                Similar skills found — showing results grouped by matched skill name.
              </p>
            )}
            {[...groupedByMatchedSkill.entries()].map(([key, groupExperts]) => {
              const groupLabel = skillGroupNames.get(key) ?? key;
              return (
                <div key={key}>
                  {hasMultipleGroups && (
                    <h3 className="text-sm font-semibold mb-2 text-foreground/80">{groupLabel}</h3>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {groupExperts.map((expert) => (
                      <Card key={expert.userId} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Link href={`/hr/employees/${expert.userId}`} className="flex items-center gap-3 group min-w-0 flex-1">
                              <Avatar className="h-10 w-10 shrink-0">
                                <AvatarImage src={resolveImageUrl(expert.image)} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                                  {(expert.name ?? "?")[0]?.toUpperCase() ?? "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                                  {expert.name ?? "Unknown"}
                                </p>
                                {expert.designation && (
                                  <p className="text-xs text-muted-foreground truncate">{expert.designation}</p>
                                )}
                                {expert.role && (
                                  <p className="text-[10px] text-muted-foreground/70 truncate">{expert.role}</p>
                                )}
                              </div>
                            </Link>
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${PROFICIENCY_COLORS[expert.matchedLevel] ?? PROFICIENCY_COLORS[1]}`}
                              title={`${expert.matchedSkill}: ${PROFICIENCY_LABELS[expert.matchedLevel] ?? `L${expert.matchedLevel}`}`}
                            >
                              {PROFICIENCY_LABELS[expert.matchedLevel] ?? `L${expert.matchedLevel}`}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1 mt-3">
                            {expert.skills.slice(0, 5).map((skill) => {
                              const isMatched = skill.name.toLowerCase().replace(/[.\s-]+/g, "").includes(
                                activeParams.skill.toLowerCase().replace(/[.\s-]+/g, ""),
                              );
                              return (
                                <Badge
                                  key={skill.name}
                                  variant={isMatched ? "default" : "secondary"}
                                  className="text-[11px] gap-1"
                                >
                                  {skill.name}
                                  {isMatched && (
                                    <span className="opacity-70 text-[9px]">
                                      {skill.level}
                                    </span>
                                  )}
                                </Badge>
                              );
                            })}
                            {expert.skills.length > 5 && (
                              <Badge variant="outline" className="text-[11px]">
                                +{expert.skills.length - 5}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {experts && experts.length > 0 && (
        <p className="text-xs text-muted-foreground mt-4">
          Found {experts.length} expert{experts.length !== 1 ? "s" : ""} with skills matching &ldquo;{activeParams.skill}&rdquo;
        </p>
      )}
    </PageWrapper>
  );
}
