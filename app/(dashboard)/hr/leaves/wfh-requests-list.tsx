"use client";

import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Check, X, Home, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const statusColors: Record<string, string> = {
  APPROVED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  PENDING: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
};

export function WFHRequestsList() {
  const router = useRouter();
  const { data: myRequests, isLoading: myLoading } = api.hr.getWfhRequests.useQuery();
  const { data: pendingRequests, isLoading: pendingLoading } = api.hr.getPendingWfhRequests.useQuery();

  const processWfhMutation = api.hr.processWfhRequest.useMutation({
    onSuccess: () => {
      toast.success("WFH request processed successfully!");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to process request");
    },
  });

  const handleApprove = (requestId: number) => {
    processWfhMutation.mutate({ requestId, status: "APPROVED" });
  };

  const handleReject = (requestId: number) => {
    processWfhMutation.mutate({ requestId, status: "REJECTED" });
  };

  if (myLoading) {
    return (
      <Card className="border-border">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {pendingRequests && pendingRequests.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Home className="h-5 w-5 text-primary" />
              Pending WFH Approvals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {req.user?.firstName} {req.user?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(req.date), "EEEE, MMMM d, yyyy")}
                  </p>
                  {req.reason && (
                    <p className="text-xs text-muted-foreground">{req.reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => handleApprove(req.id)}
                    disabled={processWfhMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleReject(req.id)}
                    disabled={processWfhMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Home className="h-5 w-5" />
            My WFH Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!myRequests || myRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No WFH requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Work From Home
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(req.date), "EEEE, MMMM d, yyyy")}
                    </p>
                    {req.reason && (
                      <p className="text-xs text-muted-foreground">{req.reason}</p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${statusColors[req.status || "PENDING"]}`}
                  >
                    {req.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

