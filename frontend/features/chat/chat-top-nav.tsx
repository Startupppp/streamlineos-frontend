"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AskAIPanel } from "./ask-ai-panel";

const TABS = [
  { href: "/chat", label: "Discuss" },
  { href: "/chat/channels", label: "Channels" },
  { href: "/chat/configuration?tab=settings", label: "Settings", configTab: "settings" as const },
  { href: "/chat/configuration?tab=voice-video", label: "Voice & Video", configTab: "voice-video" as const },
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
  const [askAiOpen, setAskAiOpen] = useState(false);

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

      <button
        type="button"
        onClick={() => setAskAiOpen(true)}
        className="ml-auto h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 transition-colors"
        title="Ask AI"
        aria-label="Ask AI"
      >
        <Sparkles className="h-4 w-4" />
      </button>

      {askAiOpen && <AskAIPanel onClose={() => setAskAiOpen(false)} />}
    </div>
  );
}
