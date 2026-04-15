"use client";

import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase } from "lucide-react";
import { format } from "date-fns";
import { EmptyPersonIllustration } from "@/components/illustrations";

interface Application {
  id: number;
  status: string | null;
  appliedAt?: string | Date | null;
  jobPosting?: { title?: string | null } | null;
}

interface ApplicationRowProps {
  app: Application;
}

const ApplicationRow = memo(function ApplicationRow({ app }: ApplicationRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div>
        <p className="text-sm font-medium">{app.jobPosting?.title ?? "Unknown Job"}</p>
        <p className="text-xs text-muted-foreground">
          {app.appliedAt ? format(new Date(app.appliedAt), "PPP") : ""}
        </p>
      </div>
      <Badge variant="outline" className="text-[10px]">
        {app.status ?? "—"}
      </Badge>
    </div>
  );
});

interface ApplicationsTabProps {
  applications?: Application[] | null;
  onApplyOpen: () => void;
}

export const ApplicationsTab = memo(function ApplicationsTab({
  applications,
  onApplyOpen,
}: ApplicationsTabProps) {
  const handleClick = useCallback(() => onApplyOpen(), [onApplyOpen]);

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Applications</CardTitle>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleClick}>
          <Briefcase className="h-3 w-3 mr-1" />Apply to Job
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {!applications?.length ? (
          <div className="py-4">
            <EmptyPersonIllustration className="mx-auto mb-4 h-32 w-32 opacity-95" />
            <p className="text-xs text-muted-foreground text-center">No applications yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {applications.map((app) => (
              <ApplicationRow key={app.id} app={app} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
