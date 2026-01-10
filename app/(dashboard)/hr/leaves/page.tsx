import { 
  getLeaveContext, 
  getApprovers, 
  getMyRequests, 
  getIncomingRequests 
} from "@/server/actions/leave-actions";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestLeaveDialog } from "./request-leave-dialog";
import { PendingRequestsList } from "./pending-requests-list";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { LeaveErrorState, NoLeaveRequestsState } from "./leaves-empty-states";
import { CalendarDays, Palmtree, Heart, Briefcase } from "lucide-react";

const leaveTypeIcons: Record<string, React.ElementType> = {
  "Annual Leave": Palmtree,
  "Sick Leave": Heart,
  "Personal Leave": CalendarDays,
  "Work From Home": Briefcase,
};

export default async function LeavesPage() {
  const [context, approvers, myRequests, incomingRequests] = await Promise.all([
    getLeaveContext(),
    getApprovers(),
    getMyRequests(),
    getIncomingRequests()
  ]);

  if (!context.success || !context.balances) {
    return (
      <div className="space-y-6">
        <LeaveErrorState />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    APPROVED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
    PENDING: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        description="Request time off and track your leave balances."
        actions={
          <RequestLeaveDialog 
            leaveTypes={context.types || []} 
            approvers={approvers} 
          />
        }
      />

      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {context.balances.map((bal, index) => {
          const Icon = leaveTypeIcons[bal.typeName || ""] || CalendarDays;
          return (
            <Card key={`${bal.leaveTypeId}-${index}`} className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {bal.typeName}
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{bal.balance}</div>
                <p className="text-xs text-muted-foreground">
                  Days Available
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="my-requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          {incomingRequests.length > 0 && (
            <TabsTrigger value="approvals" className="relative">
              Approvals
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* My Requests Tab */}
        <TabsContent value="my-requests" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">My History</CardTitle>
            </CardHeader>
            <CardContent>
              {myRequests.length === 0 ? (
                <NoLeaveRequestsState />
              ) : (
                <div className="space-y-3">
                  {myRequests.map((req) => (
                    <div 
                      key={req.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {req.leaveType?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(req.startDate), "MMM dd")} - {format(new Date(req.endDate), "MMM dd, yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="outline"
                          className={`text-xs ${statusColors[req.status || "PENDING"] || ""}`}
                        >
                          {req.status}
                        </Badge>
                        {req.status === 'PENDING' && req.approver && (
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            Approver: {req.approver.name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-4">
          <PendingRequestsList requests={incomingRequests} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

