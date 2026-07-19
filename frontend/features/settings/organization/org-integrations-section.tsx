"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle2, XCircle } from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  connected: boolean;
  connectPath: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "google-workspace",
    name: "Google Workspace",
    description: "Sync users, calendar, and Drive for your organization.",
    connected: false,
    connectPath: "/settings/connected-accounts",
  },
  {
    id: "microsoft-365",
    name: "Microsoft 365",
    description: "Sync users, calendar, and SharePoint for your organization.",
    connected: false,
    connectPath: "/settings/connected-accounts",
  },
];

function IntegrationConnectButton({ integration }: { integration: Integration }) {
  function handleConnect() {
    window.location.href = integration.connectPath;
  }
  return (
    <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={handleConnect}>
      <ExternalLink className="h-3.5 w-3.5" />
      {integration.connected ? "Manage" : "Connect"}
    </Button>
  );
}

interface OrgIntegrationsSectionProps {
  canEdit: boolean;
}

export function OrgIntegrationsSection({ canEdit }: OrgIntegrationsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Integrations</CardTitle>
        <CardDescription>
          Connect third-party services to streamline your organization workflows.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {INTEGRATIONS.map((integration) => (
            <div
              key={integration.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{integration.name}</p>
                    {integration.connected ? (
                      <Badge variant="outline" className="gap-1 text-green-600 border-green-200">
                        <CheckCircle2 className="h-3 w-3" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <XCircle className="h-3 w-3" />
                        Not connected
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{integration.description}</p>
                </div>
              </div>
              {canEdit && (
                <IntegrationConnectButton integration={integration} />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
