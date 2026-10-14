"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AREAS, MODULE_COUNT } from "./areas";
import { displaySerif } from "./fonts";

/**
 * The navbar's answer to "what is in the product": every module, grouped by the
 * part of the business it serves. Radix owns dismissal and focus; the content is
 * portalled outside `.lp`, so it re-applies the landing world itself.
 */
export function ProductMenu() {
  const [open, setOpen] = useState(false);

  function handleClose() {
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="relative z-10 flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-(--lp-ink)/70 transition-colors duration-200 hover:text-foreground data-[state=open]:text-foreground">
        Product
        <ChevronDown
          className={`size-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </PopoverTrigger>
      <PopoverContent
        sideOffset={16}
        className={`lp ${displaySerif.variable} lp-card w-2xl max-w-[calc(100vw-2rem)] rounded-3xl p-2 shadow-xl`}
      >
        <div className="grid grid-cols-5 gap-2">
          <div className="col-span-2 flex flex-col justify-between rounded-2xl bg-foreground p-5 text-white">
            <p className="lp-display text-3xl leading-tight">{MODULE_COUNT} modules, one workspace</p>
            <p className="mt-6 text-sm text-white/70">
              Turn on what you need today. Every module shares the same customers, projects and people.
            </p>
          </div>
          <ul className="col-span-3 grid grid-cols-2 gap-4 p-4">
            {AREAS.map((area) => (
              <li key={area.id}>
                <Link
                  href="/#apps"
                  onClick={handleClose}
                  className="block rounded-xl p-2 transition-colors hover:bg-(--lp-mist)"
                >
                  <span className="block text-sm font-semibold text-foreground">{area.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {area.apps.join(", ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}
