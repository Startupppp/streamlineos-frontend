"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export function SettingsAppearance() {
  const [compactView, setCompactView] = useState(false);

  const handleCompactToggle = (checked: boolean) => {
    setCompactView(checked);
    document.documentElement.classList.toggle("compact", checked);
    toast.success(checked ? "Compact view enabled" : "Compact view disabled");
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Appearance</CardTitle>
        <CardDescription>Customize how the application looks.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
          <div className="space-y-1">
            <p className="font-medium text-foreground">Compact View</p>
            <p className="text-sm text-muted-foreground">
              Use a more compact layout for lists and tables.
            </p>
          </div>
          <Switch
            id="compact-view"
            aria-label="Toggle compact view"
            checked={compactView}
            onCheckedChange={handleCompactToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}
