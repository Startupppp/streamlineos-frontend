"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { SlidersHorizontalIcon } from "@animateicons/react/lucide";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  CalendarOff,
  ClipboardList,
  ClipboardCheck,
  Briefcase,
} from "lucide-react";
import {
  EmptySearchIllustration,
  EmptyTeamIllustration,
} from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  useHrEmployees,
  useHrDepartments,
  unwrapEmployees,
} from "@/hooks/api/hr";

import { type Employee, PAGE_SIZE } from "@/features/hr/employees/hr-types";
import { EmployeesLoadingSkeleton } from "@/features/hr/employees/employees-loading-skeleton";
import { EmployeesFilters } from "@/features/hr/employees/employees-filters";
import {
  parseEmployeeListFilters,
  toHrEmployeesApiParams,
  hasActiveEmployeeFilters,
  countActiveEmployeeFilters,
  employeeFiltersToUrlUpdates,
  DEFAULT_STATUS,
} from "@/features/hr/employees/employee-list-filters";
import { HrEmployeeTable } from "@/features/hr/employees/hr-employee-table";
import { SearchInput } from "@/components/ui/search-input";
import { HrDashboardOverview, HrDashboardWidgets } from "@/features/hr/hr-dashboard-overview";
import { HrSetupProgressCard } from "@/features/hr/setup/hr-setup-progress-card";
import {
  HrHero,
  HrPageContent,
  HrPanel,
  HrQuickAction,
  HrSectionHeader,
} from "@/features/hr/shared/hr-ui";

export default function HRDashboardPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const filters = useMemo(
    () =>
      parseEmployeeListFilters(searchParams, {
        size: PAGE_SIZE,
        status: DEFAULT_STATUS,
      }),
    [searchParams],
  );

  const [searchTerm, setSearchTermLocal] = useState(filters.q);
  useEffect(() => {
    setSearchTermLocal(filters.q);
  }, [filters.q]);

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const debouncedSearchRef = useRef(debouncedSearchTerm);
  useEffect(() => {
    if (debouncedSearchRef.current === debouncedSearchTerm) return;
    debouncedSearchRef.current = debouncedSearchTerm;
    updateParams(
      employeeFiltersToUrlUpdates(
        { q: debouncedSearchTerm, page: 1 },
        { size: PAGE_SIZE, status: DEFAULT_STATUS },
      ),
    );
  }, [debouncedSearchTerm, updateParams]);

  const apiParams = useMemo(
    () =>
      toHrEmployeesApiParams({
        ...filters,
        q: debouncedSearchTerm,
      }),
    [filters, debouncedSearchTerm],
  );

  const { data: departments } = useHrDepartments();

  const {
    data: employeesPage,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useHrEmployees(apiParams);

  const displayEmployees = useMemo(
    () => unwrapEmployees(employeesPage),
    [employeesPage],
  );

  const pagination = employeesPage?.pagination;
  const totalCount = pagination?.total ?? 0;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const page = filters.page;
  const pageSize = filters.size;

  const setPage = useCallback(
    (p: number) =>
      updateParams(
        employeeFiltersToUrlUpdates(
          { page: p },
          { size: PAGE_SIZE, status: DEFAULT_STATUS },
        ),
      ),
    [updateParams],
  );

  const handlePageSizeChange = useCallback(
    (size: number) =>
      updateParams(
        employeeFiltersToUrlUpdates(
          { size, page: 1 },
          { size: PAGE_SIZE, status: DEFAULT_STATUS },
        ),
      ),
    [updateParams],
  );

  const handleClearFilters = useCallback(() => {
    setSearchTermLocal("");
    updateParams({
      q: null,
      dept: null,
      status: null,
      role: null,
      page: null,
    });
  }, [updateParams]);

  const handleRequestDelete = useCallback(
    (employee: Employee) => {
      router.push(`/hr/termination?employeeId=${employee.id}`);
    },
    [router],
  );

  if (isLoading) return <EmployeesLoadingSkeleton />;

  const showFrom = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const showTo = Math.min(page * pageSize, totalCount);
  const hasActiveFilters = hasActiveEmployeeFilters(filters, {
    status: DEFAULT_STATUS,
  });
  const activeFilterCount = countActiveEmployeeFilters(filters, {
    status: DEFAULT_STATUS,
  });

  const employeeFilters = (
    <EmployeesFilters
      search={searchTerm}
      departmentId={filters.departmentId}
      status={filters.status}
      role={filters.role}
      showRole
      departments={departments}
      hasFilters={hasActiveFilters}
      onSearchChange={setSearchTermLocal}
      onDepartmentIdChange={(id) =>
        updateParams(
          employeeFiltersToUrlUpdates(
            { departmentId: id, page: 1 },
            { size: PAGE_SIZE, status: DEFAULT_STATUS },
          ),
        )
      }
      onStatusChange={(s) =>
        updateParams(
          employeeFiltersToUrlUpdates(
            { status: s, page: 1 },
            { size: PAGE_SIZE, status: DEFAULT_STATUS },
          ),
        )
      }
      onRoleChange={(r) =>
        updateParams(
          employeeFiltersToUrlUpdates(
            { role: r, page: 1 },
            { size: PAGE_SIZE, status: DEFAULT_STATUS },
          ),
        )
      }
      onClear={handleClearFilters}
    />
  );

  return (
    <PageWrapper
      title="People Hub"
      subtitle="Directory, headcount, and day-to-day people ops"
      variant="display"
    >
      <HrPageContent>
        <HrHero
          eyebrow="Streamline HRMS"
          title="Build teams. Keep people thriving."
          description="Onboard faster, track leave and attendance, and run the full employee lifecycle from one calm workspace."
          hideDescriptionOnMobile
        >
          <div
            className={cn(
              "flex min-h-0 w-full gap-2.5 overflow-x-auto overscroll-x-contain pb-0.5 scrollbar-hide",
              "[&>*]:min-w-[min(100%,15.5rem)] [&>*]:shrink-0",
              "min-[420px]:grid min-[420px]:grid-cols-2 min-[420px]:overflow-visible min-[420px]:pb-0",
              "min-[420px]:[&>*]:min-w-0 min-[420px]:[&>*]:shrink",
              "xl:grid-cols-4",
            )}
          >
            <HrQuickAction
              href="/hr/onboarding?tab=workflow"
              icon={ClipboardCheck}
              label="Onboarding"
              description="Track new-hire checklists"
              tone="blue"
            />
            <HrQuickAction
              href="/hr/leaves"
              icon={CalendarOff}
              label="Leaves"
              description="Requests & balances"
              tone="amber"
            />
            <HrQuickAction
              href="/hr/attendance"
              icon={ClipboardList}
              label="Attendance"
              description="Daily presence"
              tone="emerald"
            />
            <HrQuickAction
              href="/hr/recruitment"
              icon={Briefcase}
              label="Recruitment"
              description="Jobs & pipeline"
              tone="violet"
            />
          </div>
        </HrHero>

        <HrDashboardOverview />

        <div>
          <HrSectionHeader
            size="lg"
            title="Employee directory"
            description={
              isFetching && !isLoading
                ? "Updating results…"
                : `${totalCount.toLocaleString()} people · page ${page} of ${totalPages}`
            }
            action={{ label: "View all", href: "/hr/employees" }}
          />

          <div className="mb-2.5 flex items-center gap-2">
            <div className="hidden w-full flex-wrap items-center gap-2 sm:flex">
              {employeeFilters}
            </div>
            <div className="flex w-full items-center gap-2 sm:hidden">
              <SearchInput
                value={searchTerm}
                onValueChange={setSearchTermLocal}
                placeholder="Search people…"
                aria-label="Search employees"
                className="min-w-0 flex-1"
              />
              <Sheet>
                <SheetTrigger asChild>
                  <AnimatedIconButton
                    icon={SlidersHorizontalIcon}
                    iconSize={14}
                    variant="outline"
                    size="sm"
                    className="relative shrink-0 gap-1.5"
                  >
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-primary text-primary-foreground border-0 font-bold">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </AnimatedIconButton>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-3 pt-2">{employeeFilters}</div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {isError ? (
            <HrPanel className="text-center py-10">
              <p className="text-sm font-semibold text-foreground">Couldn’t load employees</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Check your connection and try again.
              </p>
              <Button size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </HrPanel>
          ) : displayEmployees.length > 0 ? (
            <>
              <HrPanel padded={false} className="overflow-hidden">
                <HrEmployeeTable
                  employees={displayEmployees}
                  totalCount={totalCount}
                  page={page}
                  pageSize={pageSize}
                  totalPages={totalPages}
                  showFrom={showFrom}
                  showTo={showTo}
                  currentUserId={currentUserId}
                  onPageChange={setPage}
                  onPageSizeChange={handlePageSizeChange}
                  onRequestDelete={handleRequestDelete}
                />
              </HrPanel>
              <Button variant="outline" size="sm" className="mt-2.5 w-full sm:hidden" asChild>
                <Link href="/hr/employees">View all employees</Link>
              </Button>
            </>
          ) : hasActiveFilters ? (
            <EmptyState
              illustration={<EmptySearchIllustration className="mb-3" />}
              title="No results found"
              description="No employees match your current filters. Try adjusting your search."
              action={{ label: "Clear filters", onClick: handleClearFilters }}
            />
          ) : (
            <EmptyState
              illustration={<EmptyTeamIllustration className="mb-3" />}
              title="No employees yet"
              description="Get started by adding your first team member — or bulk-import a whole cohort."
              action={{ label: "Add Employee", href: "/hr/onboarding?tab=wizard" }}
              actionVariant="outline"
            />
          )}
        </div>

        <HrDashboardWidgets />

        <HrSetupProgressCard />
      </HrPageContent>
    </PageWrapper>
  );
}
