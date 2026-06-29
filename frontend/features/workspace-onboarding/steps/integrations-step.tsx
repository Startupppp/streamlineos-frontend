"use client";

import { useState } from "react";
import { ExternalLink, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Integration {
  id: string;
  name: string;
  description: string;
  logo: string;
}

const INTEGRATIONS: Integration[] = [
  { id: "google-workspace", name: "Google Workspace", description: "Sync calendar, contacts, and Drive files", logo: "G" },
  { id: "microsoft-365", name: "Microsoft 365", description: "Connect Teams, Outlook, and OneDrive", logo: "M" },
  { id: "gmail", name: "Gmail", description: "Send and track emails from your workspace", logo: "g" },
  { id: "outlook", name: "Outlook", description: "Sync emails and calendar with Outlook", logo: "O" },
  { id: "slack", name: "Slack", description: "Get notifications and updates in Slack", logo: "S" },
  { id: "whatsapp", name: "WhatsApp Business", description: "Communicate with customers via WhatsApp", logo: "W" },
  { id: "calendar", name: "Calendar", description: "Two-way sync with Google or Apple Calendar", logo: "C" },
];

interface IntegrationsStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function IntegrationsStep({ onNext, onBack }: IntegrationsStepProps) {
  const [connected, setConnected] = useState<Set<string>>(new Set());

  function handleConnect(integrationId: string) {
    setConnected((prev) => new Set([...prev, integrationId]));
    window.open("/settings/integrations", "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold">Connect your tools</h2>
        <p className="text-sm text-muted-foreground">
          All integrations are optional. You can connect them now or later from Settings.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {INTEGRATIONS.map((integration) => {
          const isConnected = connected.has(integration.id);
          return (
            <div
              key={integration.id}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border transition-colors",
                isConnected
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card",
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 font-bold text-muted-foreground text-sm">
                {integration.logo}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">{integration.name}</span>
                  {isConnected && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-primary border-primary/40 gap-0.5 shrink-0">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      Connected
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {integration.description}
                </p>
              </div>
              <Button
                type="button"
                variant={isConnected ? "ghost" : "outline"}
                size="sm"
                onClick={() => handleConnect(integration.id)}
                className="shrink-0 h-8 text-xs"
              >
                {isConnected ? (
                  "Settings"
                ) : (
                  <>
                    Connect
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button onClick={onNext} className="flex-1">
          Continue
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
