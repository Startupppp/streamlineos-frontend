"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BULK_ENTITIES } from "./bulk-import-entities";
import { BulkImportSection } from "./bulk-import-section";
import { ExportCard } from "./export-card";
import { PlannedImportSection } from "./planned-import-section";
import { useImportAccess } from "./use-import-access";

/** The party importer's tab. The bulk entities name their own. */
const PARTIES = "parties";

/**
 * The one place CRM data arrives and leaves.
 *
 * There used to be four ways to import: this page, and a separate `<Dialog>`
 * wizard on each of the leads, contacts and deals list pages. Those three are
 * gone and this absorbed them, because four routes into one job is four things
 * to maintain and three chances to pick the one that quietly does less.
 *
 * What each tab does underneath genuinely differs — parties are planned,
 * committed as a durable job and reversible; the rest are a single write — and
 * the page says so rather than pretending to a uniformity it does not have. It
 * is one surface with one shape, not one implementation.
 */
export function CrmImportPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { canExport, canImportParties, canImportBulk } = useImportAccess();

  const tabs = [
    ...(canImportParties ? [{ id: PARTIES, label: "Companies and people" }] : []),
    ...BULK_ENTITIES.filter((entity) => canImportBulk[entity.id]).map((entity) => ({
      id: entity.id,
      label: entity.label,
    })),
  ];

  /**
   * Which tab is open, held in the URL.
   *
   * So that the list pages can link straight at the import they mean, and so
   * that a person can send somebody else the page they are looking at — the
   * thing a dialog could never do.
   */
  const requested = searchParams.get("entity");
  const active = tabs.some((tab) => tab.id === requested) ? requested! : tabs[0]?.id;

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("entity", value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="flex flex-col gap-gap-section">
      {canExport ? <ExportCard /> : null}

      {active === undefined ? (
        <p className="text-label text-muted-foreground">
          You don’t have permission to import anything into the CRM. Ask an administrator for
          import access to leads, contacts, deals or companies.
        </p>
      ) : (
        <Tabs value={active} onValueChange={handleTabChange} className="gap-gap-section">
          {/* A tab strip with one tab is chrome, not a choice. */}
          {tabs.length > 1 ? (
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          ) : null}

          {canImportParties ? (
            // `forceMount` so a staged file survives a look at another tab.
            // Unmounting would throw away exactly the work principle 4 says a
            // person should not be able to lose by accident.
            <TabsContent key={PARTIES} value={PARTIES} forceMount>
              <PlannedImportSection />
            </TabsContent>
          ) : null}

          {BULK_ENTITIES.filter((entity) => canImportBulk[entity.id]).map((entity) => (
            <TabsContent key={entity.id} value={entity.id} forceMount>
              <BulkImportSection entity={entity} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
