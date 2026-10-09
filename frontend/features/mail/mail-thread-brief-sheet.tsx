"use client";

import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

export type MailThreadBriefState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; summary: string; actionItems: string[] };

export function MailThreadBriefSheet({ open, onOpenChange, state }: { open: boolean; onOpenChange: (open: boolean) => void; state: MailThreadBriefState }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" aria-hidden="true" />Thread brief</SheetTitle>
          <SheetDescription>A persistent summary of this conversation. Review it before acting.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-6">
          {state.status === "loading" ? <div className="space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-20 w-full" /></div> : null}
          {state.status === "error" ? <div className="flex gap-2 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="size-4 shrink-0" aria-hidden="true" />{state.message}</div> : null}
          {state.status === "ready" ? <div className="space-y-5"><section className="rounded-xl border border-primary/20 bg-primary/5 p-4"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</h3><p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">{state.summary}</p></section>{state.actionItems.length ? <section><h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next actions</h3><ul className="space-y-3">{state.actionItems.map((item, index) => <li key={index} className="flex items-start gap-2.5 text-sm leading-5"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />{item}</li>)}</ul></section> : null}</div> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
