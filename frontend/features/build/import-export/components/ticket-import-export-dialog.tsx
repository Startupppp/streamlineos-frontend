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
  hideTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TicketImportExportDialog({
  projectId,
  hideTrigger = false,
  open,
  onOpenChange,
}: TicketImportExportDialogProps) {
  const canImport = useCan("build:tickets:create");
  const canExport = useCan("build:tickets:view");
  if (!canImport && !canExport) return null;
  return (
    <TicketImportExportDialogContent
      projectId={projectId}
      canImport={canImport}
      canExport={canExport}
      hideTrigger={hideTrigger}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}

interface DialogContentProps {
  projectId: number;
  canImport: boolean;
  canExport: boolean;
  hideTrigger: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function TicketImportExportDialogContent({
  projectId,
  canImport,
  canExport,
  hideTrigger,
  open: openProp,
  onOpenChange,
}: DialogContentProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [tab, setTab] = useState(canImport ? "import" : "export");
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  function handleOpenChange(next: boolean) {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger ? (
        <DialogTrigger asChild>
          <AnimatedIconButton
            type="button"
            variant="outline"
            size="sm"
            icon={DownloadIcon}
            iconSize={14}
            className="w-full gap-1.5 sm:w-auto"
          >
            {canImport ? "Import / Export" : "Export"}
          </AnimatedIconButton>
        </DialogTrigger>
      ) : null}
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
