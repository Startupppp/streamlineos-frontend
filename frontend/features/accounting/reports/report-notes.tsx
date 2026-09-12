"use client";

import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportNotesProps {
  title: string;
  notes: readonly string[];
  className?: string;
}

export function ReportNotes({ title, notes, className }: ReportNotesProps) {
  if (notes.length === 0) return null;

  return (
    <section
      className={cn(
        "shrink-0 rounded-xl border border-border bg-card p-4 shadow-sm",
        className,
      )}
      aria-label={title}
    >
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <ul className="mt-2 space-y-1.5">
        {notes.map((note) => (
          <li key={note} className="text-label leading-relaxed text-muted-foreground">
            {note}
          </li>
        ))}
      </ul>
    </section>
  );
}
