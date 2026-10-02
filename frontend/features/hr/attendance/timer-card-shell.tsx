"use client";

import type { ReactNode } from "react";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TimerCardShell({
  chrome,
  children,
}: {
  chrome: boolean;
  children: ReactNode;
}) {
  if (!chrome) return <>{children}</>;
  return (
    <Card className="overflow-hidden">
      <CardHeader className="shrink-0 border-b px-4 pb-3 pt-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Time Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-4">{children}</CardContent>
    </Card>
  );
}
