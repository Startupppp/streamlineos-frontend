"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BULK_ENTITIES } from "./bulk-import-entities";
import { BulkImportSection } from "./bulk-import-section";
import { ExportCard } from "./export-card";
import { PlannedImportSection } from "./planned-import-section";
import { useImportAccess } from "./use-import-access";

const PARTIES = "parties";

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

  const requested = searchParams.get("entity");
  const active = tabs.find((tab) => tab.id === requested)?.id ?? tabs[0]?.id;

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
