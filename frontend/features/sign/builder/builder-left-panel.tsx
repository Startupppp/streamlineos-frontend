"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
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
  className?: string;
}

export function BuilderLeftPanel({
  envelopeId,
  documents,
  recipients,
  editable,
  className,
}: BuilderLeftPanelProps) {
  const { selectedRecipientId } = useBuilder();

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-1 flex-col border-border bg-background lg:w-72 lg:flex-none lg:shrink-0 lg:border-r",
        className,
      )}
    >
      <Tabs
        defaultValue="recipients"
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="shrink-0 px-3 pt-3">
          <TabsList className="w-full max-w-full md:w-full" aria-label="Builder panels">
            <TabsTrigger value="documents">Docs</TabsTrigger>
            <TabsTrigger value="recipients">Signers</TabsTrigger>
            <TabsTrigger value="fields">Fields</TabsTrigger>
          </TabsList>
        </div>
        <ScrollArea hideScrollbar className="min-h-0 flex-1">
          <div className="p-3 pt-4">
            <TabsContent value="documents" className="mt-0">
              <DocumentPanel
                envelopeId={envelopeId}
                documents={documents}
                editable={editable}
              />
            </TabsContent>
            <TabsContent value="recipients" className="mt-0">
              <RecipientsPanel
                envelopeId={envelopeId}
                recipients={recipients}
                editable={editable}
              />
            </TabsContent>
            <TabsContent value="fields" className="mt-0">
              <FieldPalette
                hasRecipient={selectedRecipientId !== null}
                editable={editable}
              />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
