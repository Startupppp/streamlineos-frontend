"use client";

import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import {
  Home,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { EmptyWfhIllustration, EmptyCalendarIllustration } from "@/components/illustrations";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
};

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-3 w-3 mr-1" />,
  APPROVED: <CheckCircle2 className="h-3 w-3 mr-1" />,
  REJECTED: <XCircle className="h-3 w-3 mr-1" />,
};

export function MyWfhRequests() {
  const { data: requests, isLoading } = api.hr.getWfhRequests.useQuery();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Home className="h-5 w-5 text-primary" />
          My WFH Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!requests || requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <EmptyWfhIllustration className="mb-3" />
            <p>No WFH requests yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {format(new Date(req.date), "EEEE, MMM dd, yyyy")}
                  </p>
                  {req.reason && (
                    <p className="text-xs text-muted-foreground">{req.reason}</p>
                  )}
                </div>
                <Badge
                  className={`${statusStyles[req.status || "PENDING"]} flex items-center`}
                >
                  {statusIcons[req.status || "PENDING"]}
                  {req.status || "PENDING"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PendingWfhApprovals() {
  const { data: requests, isLoading } = api.hr.getPendingWfhRequests.useQuery();
  const utils = api.useUtils();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const processRequest = api.hr.processWfhRequest.useMutation({
    onSuccess: (_, variables) => {
      const action = variables.status === "APPROVED" ? "approved" : "rejected";
      toast.success(`WFH request ${action}`);
      utils.hr.getPendingWfhRequests.invalidate();
      utils.hr.getWfhRequests.invalidate();
      setRejectDialogOpen(false);
      setRejectionReason("");
      setRejectingId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to process request");
    },
  });

  function handleApprove(requestId: number) {
    processRequest.mutate({ requestId, status: "APPROVED" });
  }

  function handleReject() {
    if (rejectingId === null) return;
    processRequest.mutate({
      requestId: rejectingId,
      status: "REJECTED",
      rejectionReason: rejectionReason || undefined,
    });
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!requests || requests.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Pending WFH Approvals
            <Badge variant="secondary" className="ml-2">
              {requests.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-muted/20"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={resolveImageUrl(req.user?.image)} />
                    <AvatarFallback className="text-xs">
                      {req.user?.firstName?.[0]}
                      {req.user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      {req.user?.firstName} {req.user?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(req.date), "EEEE, MMM dd, yyyy")}
                    </p>
                    {req.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Reason: {req.reason}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(req.id)}
                    disabled={processRequest.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRejectingId(req.id);
                      setRejectDialogOpen(true);
                    }}
                    disabled={processRequest.isPending}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject WFH Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Provide a reason for rejecting this WFH request (optional).
            </p>
            <Input
              placeholder="Enter reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processRequest.isPending}
            >
              {processRequest.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
