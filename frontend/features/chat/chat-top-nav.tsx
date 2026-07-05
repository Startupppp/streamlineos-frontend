"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AskAIPanel } from "./ask-ai-panel";

const TABS = [
  { href: "/chat", label: "Discuss" },
  { href: "/chat/channels", label: "Channels" },
];

const CONFIGURATION_ITEMS = [
  { href: "/chat/configuration?tab=settings", label: "Settings" },
  { href: "/chat/configuration?tab=notifications", label: "Notifications" },
  { href: "/chat/configuration?tab=voice-video", label: "Voice & Video" },
];

export function ChatTopNav() {
  const pathname = usePathname();
  const isConfigurationActive = pathname.startsWith("/chat/configuration");
  const [askAiOpen, setAskAiOpen] = useState(false);

  return (
    <div className="h-11 shrink-0 border-b border-border/40 bg-card/50 flex items-center gap-1 px-4">
      {TABS.map((tab) => {
        const isActive = tab.href === "/chat" ? pathname === "/chat" : pathname.startsWith(tab.href);
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "h-8 px-3 rounded-lg flex items-center gap-1 text-[13px] font-medium transition-colors",
              isConfigurationActive
                ? "bg-blue-500/10 text-blue-600"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
            )}
          >
            Configuration
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {CONFIGURATION_ITEMS.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href}>{item.label}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

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
