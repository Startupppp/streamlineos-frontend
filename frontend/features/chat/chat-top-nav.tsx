"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/chat", label: "Discuss" },
  { href: "/chat/channels", label: "Channels" },
  { href: "/chat/configuration?tab=settings", label: "Settings", configTab: "settings" as const },
  { href: "/chat/configuration?tab=voice-video", label: "Voice", configTab: "voice-video" as const },
];

function isTabActive(
  pathname: string,
  tab: (typeof TABS)[number],
  configTab: string,
): boolean {
  if (tab.href === "/chat") {
    return pathname === "/chat";
  }
  if (tab.href === "/chat/channels") {
    return pathname.startsWith("/chat/channels");
  }
  if ("configTab" in tab && tab.configTab) {
    if (!pathname.startsWith("/chat/configuration")) return false;
    const activeConfigTab = configTab === "voice-video" ? "voice-video" : "settings";
    return tab.configTab === activeConfigTab;
  }
  return false;
}

export function ChatTopNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const configTab = searchParams.get("tab") ?? "settings";

  return (
    <div className="h-11 shrink-0 border-b border-border/40 bg-card/50 flex items-center gap-1 px-4">
      {TABS.map((tab) => {
        const isActive = isTabActive(pathname, tab, configTab);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "h-8 px-3 rounded-lg flex items-center text-[13px] font-medium transition-colors",
              isActive
                ? "bg-blue-500/10 text-blue-600"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
