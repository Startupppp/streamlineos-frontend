"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { PartyPopper } from "lucide-react";
import {
  WELCOME_POP_KEY,
  WELCOME_POP_NAME_KEY,
} from "@/features/org-setup/components/step-generation";

/**
 * One-shot toast after org-setup redirects to the dashboard.
 * Complements the full-screen WelcomeCelebration on the setup step.
 */
export function WelcomeToast() {
  useEffect(() => {
    let name = "your workspace";
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
        "Your workspace is live. Explore the dashboard or pick up Getting Started tips on the right.",
      duration: 6000,
      icon: <PartyPopper className="h-4 w-4 text-blue-600" />,
    });
  }, []);

  return null;
}
