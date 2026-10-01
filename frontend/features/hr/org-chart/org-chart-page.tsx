"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PersonDrawer } from "@/components/shared";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useCan } from "@/hooks/api/access";
import { PAGE_BODY_EMPTY_CLASS, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import type { OrgChartNode } from "./types";
import { OrgChartCollection } from "./org-chart-collection";

export function OrgChartPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearchValue = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(urlSearchValue);
  const [selected, setSelected] = useState<OrgChartNode | null>(null);
  const canSeePay = useCan("payroll:salaries:view");
  const [observedQuery, setObservedQuery] = useState(urlSearchValue);
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);

  if (urlSearchValue !== observedQuery) {
    setObservedQuery(urlSearchValue);
    if (urlSearchValue !== debouncedSearch) setSearchInput(urlSearchValue);
  }

  const validSearch = debouncedSearch.length >= 2 ? debouncedSearch : undefined;

  useEffect(() => {
    if (debouncedSearch === urlSearchValue) return;
    const next = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) next.set("q", debouncedSearch);
    else next.delete("q");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debouncedSearch, urlSearchValue, searchParams, router, pathname]);

  function handleSearchChange(value: string) {
    setSearchInput(value);
  }

  const handleSelect = useCallback((employee: OrgChartNode) => setSelected(employee), []);
  const handleDrawerOpenChange = useCallback((open: boolean) => {
    if (!open) setSelected(null);
  }, []);

  return (
    <PageWrapper
      title="Organization chart"
      subtitle="Explore reporting lines without loading the entire workforce."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <SearchInput
            value={searchInput}
            onValueChange={handleSearchChange}
            placeholder="Search people, roles, departments…"
            maxLength={100}
          />
        </div>
      }
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      {debouncedSearch.length === 1 ? (
        <EmptyState
          className={PAGE_BODY_EMPTY_CLASS}
          illustrationPreset="companies"
          title="Keep typing"
          description="Enter at least two characters to search the organization."
        />
      ) : (
        <OrgChartCollection
          key={validSearch ?? "roots"}
          search={validSearch}
          onSelect={handleSelect}
        />
      )}

      <PersonDrawer
        open={selected !== null}
        onOpenChange={handleDrawerOpenChange}
        person={
          selected
            ? {
                userId: selected.id,
                name: selected.name,
                image: selected.image,
                designation: selected.designation ?? selected.role,
                departmentName: selected.departmentName,
              }
            : null
        }
        canSeePay={canSeePay}
        profileHref={selected ? `/hr/employees/${selected.id}` : undefined}
        sections={{ overview: <OrgChartPersonOverview node={selected} /> }}
      />
    </PageWrapper>
  );
}

function OrgChartPersonOverview({ node }: { node: OrgChartNode | null }) {
  if (!node) return null;
  return (
    <dl className="space-y-2 text-dense">
      <div className="flex gap-2">
        <dt className="w-32 shrink-0 text-muted-foreground">Designation</dt>
        <dd className="min-w-0 text-foreground">
          {node.designation ?? node.role ?? "Not recorded"}
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="w-32 shrink-0 text-muted-foreground">Department</dt>
        <dd className="min-w-0 text-foreground">
          {node.departmentName ?? "Not recorded"}
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="w-32 shrink-0 text-muted-foreground">Direct reports</dt>
        <dd className="min-w-0 text-foreground">
          {node.hasDirectReports ? "Yes" : "None visible to you"}
        </dd>
      </div>
    </dl>
  );
}
