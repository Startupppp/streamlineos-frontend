"use client";

import { useState } from "react";
import { DownloadIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/hooks/api/access";
import { TicketExportPanel } from "./ticket-export-panel";
import { TicketImportPanel } from "./ticket-import-panel";

interface TicketImportExportDialogProps {
  projectId: number;
}

export function TicketImportExportDialog({ projectId }: TicketImportExportDialogProps) {
  const canImport = useCan("build:tickets:create");
  const canExport = useCan("build:tickets:view");
  if (!canImport && !canExport) return null;
  return (
    <TicketImportExportDialogContent
      projectId={projectId}
      canImport={canImport}
      canExport={canExport}
    />
  );
}

interface DialogContentProps extends TicketImportExportDialogProps {
  canImport: boolean;
  canExport: boolean;
}

function TicketImportExportDialogContent({
  projectId,
  canImport,
  canExport,
}: DialogContentProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(canImport ? "import" : "export");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <AnimatedIconButton
          type="button"
          variant="outline"
          size="sm"
          icon={DownloadIcon}
          iconSize={14}
          className="h-8 gap-1.5 text-xs"
        >
          {canImport ? "Import / Export" : "Export"}
        </AnimatedIconButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import and export tickets</DialogTitle>
          <DialogDescription>
            Move tickets in and out of this project as CSV or JSON. An import is checked
            against the same rules as creating a ticket by hand.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {canImport ? <TabsTrigger value="import">Import</TabsTrigger> : null}
              {canExport ? <TabsTrigger value="export">Export</TabsTrigger> : null}
            </TabsList>
            {canImport ? (
              <TabsContent value="import" className="pt-2">
                <TicketImportPanel projectId={projectId} />
              </TabsContent>
            ) : null}
            {canExport ? (
              <TabsContent value="export" className="pt-2">
                <TicketExportPanel projectId={projectId} />
              </TabsContent>
            ) : null}
          </Tabs>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
