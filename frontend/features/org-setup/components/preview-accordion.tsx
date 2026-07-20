"use client";

import { memo } from "react";
import { LayoutGrid } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { WorkspacePreviewSnapshot } from "../lib/preview-snapshot";
import { previewSnapshotsEqual } from "../lib/preview-snapshot";
import { WorkspacePreviewMock } from "./workspace-preview-mock";

type PreviewAccordionProps = {
  snapshot: WorkspacePreviewSnapshot;
};

function PreviewAccordionInner({ snapshot }: PreviewAccordionProps) {
  return (
    <div className="mb-3 min-w-0 xl:hidden">
      <div className="mb-3 hidden md:block">
        <p className="mb-2 text-[12px] font-medium text-muted-foreground">Workspace preview</p>
        <WorkspacePreviewMock snapshot={snapshot} compact className="w-full" />
      </div>

      <Accordion type="single" collapsible className="md:hidden">
        <AccordionItem value="preview" className="border-0">
          <AccordionTrigger className="min-h-10 py-2 text-xs font-medium hover:no-underline">
            <span className="flex items-center gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Preview your workspace
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-2 pt-1">
            <WorkspacePreviewMock snapshot={snapshot} compact className="w-full" />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export const PreviewAccordion = memo(PreviewAccordionInner, (prev, next) =>
  previewSnapshotsEqual(prev.snapshot, next.snapshot),
);
