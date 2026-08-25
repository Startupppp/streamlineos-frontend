"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { PartyPopper } from "lucide-react";
import { WELCOME_POP_KEY, WELCOME_POP_NAME_KEY } from "@/lib/welcome-pop";

export function WelcomeToast() {
  useEffect(() => {
    let name = "your organization";
    try {
      if (sessionStorage.getItem(WELCOME_POP_KEY) !== "1") return;
      sessionStorage.removeItem(WELCOME_POP_KEY);
      const stored = sessionStorage.getItem(WELCOME_POP_NAME_KEY);
      if (stored?.trim()) name = stored.trim();
      sessionStorage.removeItem(WELCOME_POP_NAME_KEY);
    } catch {
      return;
    }

    toast.success(`Welcome to ${name}!`, {
      description:
        "Your organization is live. Explore the dashboard or pick up Getting Started tips on the right.",
      duration: 6000,
      icon: <PartyPopper className="h-4 w-4 text-status-info-ink" />,
    });
  }, []);

  return null;
}
