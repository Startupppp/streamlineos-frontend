"use client";

import { useState } from "react";
import { Mail, AlertTriangle, CalendarCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LettersHistoryTable } from "./letters-history-table";
import { ComplianceCalendar } from "./compliance-calendar";
import { ExpiringDocumentsTable } from "./expiring-documents-table";
import { useLetters } from "@/hooks/api/hr/letters";
import { useHrDocumentExpiry } from "@/hooks/api/hr";
import { useCan } from "@/hooks/api/access";

export function DocumentsExtendedSection() {
  const [activeTab, setActiveTab] = useState("letters");
  const canManageCompliance = useCan("hr:compliance:manage");
  const { data: letters = [], isLoading: lettersLoading } = useLetters();
  const { data: expiry, isLoading: expiryLoading } = useHrDocumentExpiry(30, {
    enabled: activeTab === "expiring",
  });

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-card overflow-hidden">
      <CardContent className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="letters" className="gap-1.5">
              <Mail className="h-3 w-3" />
              Letters
            </TabsTrigger>
            <TabsTrigger value="expiring" className="gap-1.5">
              <AlertTriangle className="h-3 w-3" />
              Expiring
            </TabsTrigger>
            {canManageCompliance ? (
              <TabsTrigger value="compliance" className="gap-1.5">
                <CalendarCheck className="h-3 w-3" />
                Calendar
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="letters" className="mt-0">
            <LettersHistoryTable letters={letters} isLoading={lettersLoading} />
          </TabsContent>

          <TabsContent value="expiring" className="mt-0">
            <ExpiringDocumentsTable
              expiringDocuments={(expiry?.expiringDocuments ?? []).flatMap((document) =>
                document.expiryDate
                  ? [{
                      id: document.id,
                      name: document.name,
                      type: document.type,
                      expiryDate: document.expiryDate,
                      userId: document.userId,
                    }]
                  : [],
              )}
              expiringCertifications={(expiry?.expiringCertifications ?? []).flatMap((certification) =>
                certification.expiryDate
                  ? [{ ...certification, expiryDate: certification.expiryDate }]
                  : [],
              )}
              isLoading={expiryLoading}
            />
          </TabsContent>

          {canManageCompliance ? (
            <TabsContent value="compliance" className="mt-0">
              <ComplianceCalendar />
            </TabsContent>
          ) : null}
        </Tabs>
      </CardContent>
    </Card>
  );
}
