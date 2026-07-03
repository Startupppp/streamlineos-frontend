"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Search,
  Building2,
  Globe,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyCompaniesIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useCrmOrganizations } from "@/hooks/api/crm";
import { ErrorState } from "@/components/shared/error-state";
import { CreateOrgDialog } from "@/features/crm/companies/create-org-dialog";

const PAGE_SIZE = 20;

function getHealthBadgeClasses(score: number | null): string {
  if (score === null || score === undefined)
    return "bg-slate-100 text-slate-700 border-slate-200";
  if (score >= 70) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 40) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

export default function CompaniesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const search = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page")) || 1;
  const [inputValue, setInputValue] = useState(search);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const { data, isLoading, isError, refetch } = useCrmOrganizations({
    search: search || undefined,
    limit: PAGE_SIZE,
    page,
  });

  const totalPages = data?.totalPages ?? 0;

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleClearFilters = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setInputValue("");
    updateParams({ q: null, page: null });
  }, [updateParams]);
  const handlePrevPage = useCallback(
    () => updateParams({ page: page <= 2 ? null : String(page - 1) }),
    [updateParams, page],
  );
  const handleNextPage = useCallback(
    () => updateParams({ page: String(page + 1) }),
    [updateParams, page],
  );
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParams({ q: value || null, page: null });
      }, 300);
    },
    [updateParams],
  );

  const containerVariants = shouldReduceMotion ? {} : staggerContainer;
  const itemVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : fadeUp;

  return (
    <PageWrapper
      title="Companies"
      subtitle={isLoading ? "Loading..." : `${data?.totalCount ?? 0} companies`}
      actions={
        <>
          <motion.div whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New Company
            </Button>
          </motion.div>
          <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
        </>
      }
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 lg:gap-3">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              value={inputValue}
              onChange={handleSearchChange}
              className="h-8 w-full min-w-0 pl-8 text-xs"
            />
          </div>
        </div>
      }
    >
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-14 rounded-full shrink-0" />
                </div>
                <div className="space-y-1.5 mt-3">
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Failed to load companies"
          description="An error occurred while loading your companies. Please try again."
          onRetry={handleRetry}
          className="flex-1 min-h-[50vh]"
        />
      ) : (
        <motion.div
          className="space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {(data?.organizations.length ?? 0) === 0 ? (
            <EmptyState
              illustration={<EmptyCompaniesIllustration className="w-36 h-36" />}
              title="No companies found"
              description={
                search
                  ? "No companies match your search."
                  : "Create your first company to get started."
              }
              action={
                search
                  ? { label: "Clear filters", onClick: handleClearFilters }
                  : { label: "New Company", onClick: handleOpenCreate }
              }
              className="min-h-[50vh]"
            />
          ) : (
            <motion.div
              variants={itemVariants}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {data?.organizations.map((org) => {
                const healthClass = getHealthBadgeClasses(org.healthScore);
                return (
                  <Link
                    key={org.id}
                    href={`/crm/companies/${org.id}`}
                    className="block group"
                  >
                    <Card className="bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow h-full">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-md bg-blue-50 flex items-center justify-center text-xs font-semibold text-blue-600 shrink-0">
                              {org.name[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {org.name}
                              </p>
                              {org.industry && (
                                <p className="text-xs text-muted-foreground">
                                  {org.industry}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn("text-[9px] px-1.5 py-0 h-4 shrink-0", healthClass)}
                          >
                            {org.healthScore !== null ? `${org.healthScore}%` : "N/A"}
                          </Badge>
                        </div>

                        <div className="mt-3 space-y-1.5">
                          {org.domain && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Globe className="h-3 w-3 shrink-0" />
                              <span className="truncate">{org.domain}</span>
                            </div>
                          )}
                          {org.size && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Users className="h-3 w-3 shrink-0" />
                              <span>{org.size} employees</span>
                            </div>
                          )}
                          {org.website && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3 shrink-0" />
                              <span className="truncate">{org.website}</span>
                            </div>
                          )}
                        </div>

                        {org.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {org.description}
                          </p>
                        )}
                        <div className="mt-3 flex justify-end">
                          <span className="text-xs text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            View details <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </motion.div>
          )}

          {totalPages > 1 && (
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-center gap-2"
            >
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={handlePrevPage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={handleNextPage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}
    </PageWrapper>
  );
}
