"use client";

import { useRef } from "react";

interface Link {
  href: string;
  label: string;
}

/**
 * A <details> disclosure, so the menu opens and every link works without JavaScript. With
 * JavaScript it also closes on Escape (returning focus to the toggle) and keeps Tab inside the open
 * menu, cycling back to the toggle.
 */
export function MobileNav({ links, cta }: { links: Link[]; cta: Link }) {
  const ref = useRef<HTMLDetailsElement>(null);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDetailsElement>) {
    const details = ref.current;
    if (!details?.open) return;
    const toggle = details.querySelector("summary");
    if (event.key === "Escape") {
      details.open = false;
      toggle?.focus();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...details.querySelectorAll<HTMLElement>("summary, a")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  function closeMenu() {
    if (ref.current) ref.current.open = false;
  }

  return (
    <details ref={ref} onKeyDown={handleKeyDown} className="group md:hidden">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-journal-rule px-4 text-sm text-journal-ink marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">Menu</span>
        <span className="hidden group-open:inline">Close</span>
      </summary>
      <nav aria-label="Journal" className="absolute inset-x-0 top-full z-40 border-b border-journal-rule bg-journal-paper px-4 pb-6 pt-2">
        <ul className="flex flex-col">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={closeMenu} className="flex min-h-11 items-center border-b border-journal-rule text-lg text-journal-ink">{l.label}</a>
            </li>
          ))}
        </ul>
        <a href={cta.href} onClick={closeMenu} className="mt-5 flex min-h-11 items-center justify-center rounded-full bg-journal-ink px-5 text-journal-paper">{cta.label}</a>
      </nav>
    </details>
  );
}
