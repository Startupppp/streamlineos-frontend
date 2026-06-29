"use client";

import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { useResourceAllocation } from "@/hooks/api/projects";
import { ErrorState } from "@/components/shared/error-state";

const PROJECT_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
];

function getInitials(name: string | null, email: string) {
  if (name) return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  return email.substring(0, 2).toUpperCase();
}

export default function ResourceAllocationPage() {
  const { data: entries, isLoading, isError, refetch } = useResourceAllocation();

  function handleRetry() {
    refetch();
  }

  const maxTickets = entries ? Math.max(...entries.map((e) => e.totalOpen), 1) : 1;

  return (
    <PageWrapper
      title="Resource Allocation"
      subtitle="Open ticket distribution across team members and active projects"
    >
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={handleRetry} />
      ) : !entries || entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 min-h-[300px] text-center space-y-4">
          <Users className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">No open tickets assigned yet.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/projects">View Projects</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, idx) => {
            const utilPct = Math.round((entry.totalOpen / maxTickets) * 100);
            return (
              <Card key={entry.user.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={entry.user.image ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(entry.user.name, entry.user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div>
                          <p className="font-medium text-sm">{entry.user.name ?? entry.user.email}</p>
                          <p className="text-xs text-muted-foreground">{entry.user.email}</p>
                        </div>
                        <Badge variant={entry.totalOpen > 10 ? "destructive" : entry.totalOpen > 5 ? "secondary" : "outline"}>
                          {entry.totalOpen} open
                        </Badge>
                      </div>
                      <Progress value={utilPct} className="h-1.5 mb-2" />
                      <div className="flex flex-wrap gap-1.5">
                        {entry.byProject.map((p, pIdx) => (
                          <div
                            key={p.projectId}
                            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-muted"
                          >
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${PROJECT_COLORS[(pIdx + idx) % PROJECT_COLORS.length]}`}
                            />
                            <span className="font-mono text-[10px] text-muted-foreground">{p.projectKey}</span>
                            <span>{p.projectName}</span>
                            <span className="font-semibold">{p.open}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
