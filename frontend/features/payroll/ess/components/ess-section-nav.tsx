"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface EssSectionNavItem {
  id: string;
  label: string;
}

interface EssSectionNavProps {
  items: EssSectionNavItem[];
}

export function EssSectionNav({ items }: EssSectionNavProps) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");
  const navRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  };

  if (items.length <= 1) return null;

  return (
    <div
      ref={navRef}
      className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border shrink-0"
    >
      <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-1 px-4 sm:px-6 py-1.5">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleClick(item.id)}
            className={cn(
              "shrink-0 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
              activeId === item.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
