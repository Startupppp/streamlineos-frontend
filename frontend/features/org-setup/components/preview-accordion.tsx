"use client";

import { LayoutGrid } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { WorkspacePreviewPanel } from "./workspace-preview-panel";
import type { WizardData } from "../lib/types";

export function PreviewAccordion({ data }: { data: WizardData }) {
  return (
    <Accordion type="single" collapsible className="lg:hidden mb-3">
      <AccordionItem value="preview" className="rounded-lg border border-border bg-card px-3">
        <AccordionTrigger className="text-[12.5px] font-medium py-2.5 hover:no-underline">
          <span className="flex items-center gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" /> Preview your workspace
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <WorkspacePreviewPanel data={data} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
