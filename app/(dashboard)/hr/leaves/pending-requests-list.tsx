"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { processLeaveRequest } from "@/server/actions/leave-actions";
import { Check, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRouter } from "next/navigation";

interface PendingRequestsListProps {
    requests: any[]; // Using any to avoid strict type duplication for now
}

export function PendingRequestsList({ requests }: PendingRequestsListProps) {
     const router = useRouter();
     const [processingId, setProcessingId] = useState<number | null>(null);

     async function handleProcess(requestId: number, status: "APPROVED" | "REJECTED") {
         setProcessingId(requestId);
         const res = await processLeaveRequest({ requestId, status });
         setProcessingId(null);
         
         if (res.success) {
             toast.success(`Request ${status.toLowerCase()} successfully`);
             router.refresh();
         } else {
             toast.error(res.error || "Failed to process");
         }
     }

     if (requests.length === 0) {
         return (
             <div className="text-center py-8 text-muted-foreground">
                 No pending approvals.
             </div>
         );
     }

     return (
         <div className="space-y-4">
             {requests.map(req => (
                 <Card key={req.id}>
                     <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-base font-semibold">
                                    {req.user?.name || req.user?.email}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">{req.leaveType?.name}</p>
                            </div>
                            <Badge variant="outline">{req.status}</Badge>
                        </div>
                     </CardHeader>
                     <CardContent className="pb-2">
                         <div className="grid grid-cols-2 gap-4 text-sm">
                             <div>
                                 <span className="text-muted-foreground block">From</span>
                                 {format(new Date(req.startDate), "MMM dd, yyyy")}
                             </div>
                             <div>
                                 <span className="text-muted-foreground block">To</span>
                                 {format(new Date(req.endDate), "MMM dd, yyyy")}
                             </div>
                         </div>
                         {req.reason && (
                             <div className="mt-3 text-sm bg-muted/50 p-2 rounded">
                                 <span className="font-semibold">Reason: </span> {req.reason}
                             </div>
                         )}
                     </CardContent>
                     <CardFooter className="justify-end gap-2 pt-2">
                         <Button 
                            variant="destructive" 
                            size="sm"
                            disabled={processingId === req.id}
                            onClick={() => handleProcess(req.id, "REJECTED")}
                         >
                             {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4 mr-2" />}
                             Reject
                         </Button>
                         <Button 
                            variant="default" // green-ish usually better but default is black/primary
                            className="bg-green-600 hover:bg-green-700"
                            size="sm"
                            disabled={processingId === req.id}
                            onClick={() => handleProcess(req.id, "APPROVED")}
                         >
                             {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4 mr-2" />}
                             Approve
                         </Button>
                     </CardFooter>
                 </Card>
             ))}
         </div>
     );
}
