"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { KB_CHAT } from "@/lib/knowledge-routes";
import { cn } from "@/lib/utils";

interface AskDocumentsCtaProps {
  className?: string;
}

export function AskDocumentsCta({ className }: AskDocumentsCtaProps) {
  return (
    <div
      className={cn(
        "min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:basis-auto sm:flex-none",
        className,
      )}
    >
      <Link
        href={KB_CHAT}
        className="ask-documents-cta group relative inline-flex h-9 w-full items-center justify-center gap-1.5 overflow-hidden rounded-md px-3 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="relative z-10 inline-flex items-center gap-1.5">
          <Sparkles
            aria-hidden="true"
            className="ask-documents-cta__icon size-3.5 shrink-0"
          />
          <span className="ask-documents-cta__label">Ask documents</span>
        </span>
        <span
          className="ask-documents-cta__spark ask-documents-cta__spark--1"
          aria-hidden="true"
        />
        <span
          className="ask-documents-cta__spark ask-documents-cta__spark--2"
          aria-hidden="true"
        />
        <span
          className="ask-documents-cta__spark ask-documents-cta__spark--3"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}
