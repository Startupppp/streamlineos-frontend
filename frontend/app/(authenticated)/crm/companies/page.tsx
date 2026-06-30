"use client";

import { useState, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  Building2,
  Globe,
  Users,
  ChevronLeft,
  ChevronRight,
  Heart,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useCrmOrganizations } from "@/hooks/api/crm";
import { ErrorState } from "@/components/shared/error-state";
import { CreateOrgDialog } from "@/features/crm/companies/create-org-dialog";

const PAGE_SIZE = 20;

function getHealthBadge(score: number | null) {
  if (score === null || score === undefined)
    return { label: "N/A", color: "text-muted-foreground", bg: "bg-muted/50" };
  if (score >= 70)
    return {
      label: "Healthy",
      color: "text-emerald-400",
      bg: "bg-emerald-500/15",
    };
  if (score >= 40)
    return { label: "At Risk", color: "text-amber-400", bg: "bg-amber-500/15" };
  return { label: "Critical", color: "text-red-400", bg: "bg-red-500/15" };
}

export default function CompaniesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);

  const search = searchParams.get("q") || "";
  const page = Number(searchParams.get("page")) || 1;

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
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);
  const handlePrevPage = useCallback(
    () => updateParams({ page: page <= 2 ? null : String(page - 1) }),
    [updateParams, page],
  );
  const handleNextPage = useCallback(
    () => updateParams({ page: String(page + 1) }),
    [updateParams, page],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      updateParams({ q: e.target.value || null, page: null }),
    [updateParams],
  );

  return (
    <PageWrapper
      title="Companies"
      subtitle={
        isLoading ? "Loading..." : `${data?.totalCount ?? 0} companies`
      }
      actions={
        <>
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              onClick={handleOpenCreate}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" /> New Company
            </Button>
          </motion.div>
          <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
        </>
      }
      filters={
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-14 rounded-full shrink-0" />
                  </div>
                  <div className="space-y-1.5 mt-3">
                    <Skeleton className="h-3 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {(data?.organizations.length ?? 0) === 0 ? (
            <EmptyState
              illustration={<EmptyProjectsIllustration className="w-36 h-36" />}
              title="No companies found"
              description={
                search
                  ? "No companies match your search."
                  : "Create your first company to get started."
              }
              action={
                search
                  ? undefined
                  : { label: "New Company", onClick: handleOpenCreate }
              }
              className="min-h-[50vh]"
            />
          ) : (
            <motion.div
              variants={fadeUp}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {data?.organizations.map((org) => {
                const health = getHealthBadge(org.healthScore);
                return (
                  <Link
                    key={org.id}
                    href={`/crm/companies/${org.id}`}
                    className="block group"
                  >
                    <Card className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 hover:shadow-md transition-all hover:border-violet-500/40 h-full">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-sm font-semibold text-violet-600 shrink-0">
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
                            className={cn(
                              "text-[10px] shrink-0",
                              health.bg,
                              health.color,
                            )}
                          >
                            <Heart className="h-2.5 w-2.5 mr-0.5" />
                            {org.healthScore !== null
                              ? `${org.healthScore}%`
                              : "N/A"}
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
                          <span className="text-xs text-violet-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
              variants={fadeUp}
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
