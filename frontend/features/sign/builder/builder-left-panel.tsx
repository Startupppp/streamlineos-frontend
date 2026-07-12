"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SignDocument, SignRecipient } from "@/types/sign";
import { DocumentPanel } from "./document-panel";
import { RecipientsPanel } from "./recipients-panel";
import { FieldPalette } from "./field-palette";
import { useBuilder } from "./builder-context";

interface BuilderLeftPanelProps {
  envelopeId: number;
  documents: SignDocument[];
  recipients: SignRecipient[];
  editable: boolean;
}

export function BuilderLeftPanel({ envelopeId, documents, recipients, editable }: BuilderLeftPanelProps) {
  const { selectedRecipientId } = useBuilder();

  return (
    <div className="h-full flex flex-col border-r border-border w-72 shrink-0">
      <Tabs defaultValue="recipients" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-3 mt-3 grid w-auto grid-cols-3">
          <TabsTrigger value="documents">Docs</TabsTrigger>
          <TabsTrigger value="recipients">Signers</TabsTrigger>
          <TabsTrigger value="fields">Fields</TabsTrigger>
        </TabsList>
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          <TabsContent value="documents" className="mt-0">
            <DocumentPanel envelopeId={envelopeId} documents={documents} editable={editable} />
          </TabsContent>
          <TabsContent value="recipients" className="mt-0">
            <RecipientsPanel envelopeId={envelopeId} recipients={recipients} editable={editable} />
          </TabsContent>
          <TabsContent value="fields" className="mt-0">
            <FieldPalette hasRecipient={selectedRecipientId !== null} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
