"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GalleryCase } from "@/features/build/shared/build-list-gallery-cases";

export function ReportsTabsCase() {
  return (
    <GalleryCase id="reports-tabs" title="Reports · tab navigation + chart headings">
      <Tabs defaultValue="agile" className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <TabsList>
            <TabsTrigger value="agile">Agile Reports</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
          <TabsContent value="agile" className="mt-0 flex flex-col gap-4">
            <h3 className="text-sm font-medium text-foreground">Velocity</h3>
            <div
              className="h-32 rounded-md border border-dashed border-border"
              role="img"
              aria-label="Velocity chart placeholder — live data not loaded in gallery"
            />
            <h3 className="text-sm font-medium text-foreground">Burnup</h3>
            <div
              className="h-32 rounded-md border border-dashed border-border"
              role="img"
              aria-label="Burnup chart placeholder — live data not loaded in gallery"
            />
          </TabsContent>
          <TabsContent value="overview" className="mt-0">
            <p className="text-dense text-muted-foreground">Overview metrics</p>
          </TabsContent>
        </div>
      </Tabs>
    </GalleryCase>
  );
}
