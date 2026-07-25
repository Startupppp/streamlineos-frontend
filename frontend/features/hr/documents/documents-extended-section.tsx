"use client";

import { Mail, AlertTriangle, CalendarCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LettersHistoryTable } from "./letters-history-table";
import { ComplianceCalendar } from "./compliance-calendar";
import { ExpiringDocumentsTable } from "./expiring-documents-table";
import { useLetters } from "@/hooks/api/hr/letters";
import { useHrDocumentList } from "@/hooks/api/hr";

export function DocumentsExtendedSection() {
  const { data: letters = [], isLoading: lettersLoading } = useLetters();
  const { data: allDocsPage, isLoading: docsLoading } = useHrDocumentList({ limit: 100 });
  const allDocs = allDocsPage?.data ?? [];

  const expiringDocs = allDocs.filter(
    (d) => d.expiryDate && new Date(d.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  );

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
      <CardContent className="p-4">
        <Tabs defaultValue="letters">
          <TabsList className="mb-4">
            <TabsTrigger value="letters" className="gap-1.5">
              <Mail className="h-3 w-3" />
              Letters
            </TabsTrigger>
            <TabsTrigger value="expiring" className="gap-1.5">
              <AlertTriangle className="h-3 w-3" />
              Expiring
            </TabsTrigger>
            <TabsTrigger value="compliance" className="gap-1.5">
              <CalendarCheck className="h-3 w-3" />
              Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="letters" className="mt-0">
            <LettersHistoryTable letters={letters} isLoading={lettersLoading} />
          </TabsContent>

          <TabsContent value="expiring" className="mt-0">
            <ExpiringDocumentsTable
              expiringDocuments={expiringDocs.map((d) => ({
                id: d.id,
                name: d.name,
                type: d.type ?? "",
                expiryDate: d.expiryDate ?? "",
                userId: d.userId ?? null,
              }))}
              expiringCertifications={[]}
              isLoading={docsLoading}
            />
          </TabsContent>

          <TabsContent value="compliance" className="mt-0">
            <ComplianceCalendar />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
