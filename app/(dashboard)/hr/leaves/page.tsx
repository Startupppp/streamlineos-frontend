import {
  getLeaveContext,
  getApprovers,
  getMyRequests,
  getIncomingRequests,
} from "@/server/actions/leave-actions";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestLeaveDialog } from "./request-leave-dialog";
import { PendingRequestsList } from "./pending-requests-list";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { LeaveErrorState, NoLeaveRequestsState } from "./leaves-empty-states";
import { CalendarDays, Palmtree, Heart } from "lucide-react";
import { getColorSafe, leaveStatusColors } from "@/lib/theme-constants";

const leaveTypeIcons: Record<string, React.ElementType> = {
  "Annual Leave": Palmtree,
  "Sick Leave": Heart,
  "Personal Leave": CalendarDays,
};

const MAX_BALANCE_DAYS = 20;

export default async function LeavesPage() {
  const [context, approvers, myRequests, incomingRequests] = await Promise.all([
    getLeaveContext(),
    getApprovers(),
    getMyRequests(),
    getIncomingRequests(),
  ]);

  if (!context.success || !context.balances) {
    return (
      <div className="space-y-6">
        <LeaveErrorState />
      </div>
    );
  }

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" role="list" aria-label="Leave balances">
        {context.balances.map((bal, index) => {
          const Icon = leaveTypeIcons[bal.typeName ?? ""] ?? CalendarDays;
          const balanceNum = parseFloat(bal.balance) || 0;
          const pct = Math.min((balanceNum / MAX_BALANCE_DAYS) * 100, 100);
          return (
            <Card key={`${bal.leaveTypeId}-${index}`} className="border-border" role="listitem">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {bal.typeName}
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{bal.balance}</div>
                <p className="text-xs text-muted-foreground">Days Available</p>
                <div
                  className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={balanceNum}
                  aria-valuemin={0}
                  aria-valuemax={MAX_BALANCE_DAYS}
                  aria-label={`${bal.typeName} balance`}
                  aria-valuetext={`${bal.balance} days available`}
                >
                  <div
                    className={`h-full rounded-full transition-all ${
                      balanceNum <= 2 ? "bg-red-500" : balanceNum <= 5 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
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
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5" aria-label={`${incomingRequests.length} pending approvals`}>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-requests" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">My History</CardTitle>
            </CardHeader>
            <CardContent aria-live="polite">
              {myRequests.length === 0 ? (
                <NoLeaveRequestsState />
              ) : (
                <div className="space-y-3" role="list" aria-label="Leave request history">
                  {myRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                      role="listitem"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {req.leaveType?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(req.startDate), "MMM dd")} -{" "}
                          {format(new Date(req.endDate), "MMM dd, yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getColorSafe(leaveStatusColors, req.status ?? "PENDING")}`}
                        >
                          {req.status}
                        </Badge>
                        {req.status === "PENDING" && req.approver && (
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

        <TabsContent value="approvals" className="space-y-4">
          <PendingRequestsList requests={incomingRequests} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
