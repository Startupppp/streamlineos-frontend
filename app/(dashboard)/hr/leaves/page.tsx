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
import { PendingRequestsList } from "./pending-requests-list"; // We just made this
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth"; // For basic session check if needed

export default async function LeavesPage() {
    const session = await auth();
    // Fetch all data in parallel
    const [context, approvers, myRequests, incomingRequests] = await Promise.all([
        getLeaveContext(),
        getApprovers(),
        getMyRequests(),
        getIncomingRequests()
    ]);

    if (!context.success || !context.balances) {
        return <div>Error loading leave data. Please try again.</div>;
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Leave Management</h2>
                <div className="flex items-center space-x-2">
                    <RequestLeaveDialog 
                        leaveTypes={context.types || []} 
                        approvers={approvers} 
                    />
                </div>
            </div>

            {/* Balance Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {(context.balances as any[]).map((bal) => (
                    <Card key={bal.leaveTypeId}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {bal.typeName}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{bal.balance}</div>
                            <p className="text-xs text-muted-foreground">
                                Days Available
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Tabs defaultValue="my-requests" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="my-requests">My Requests</TabsTrigger>
                    {incomingRequests.length > 0 && (
                         <TabsTrigger value="approvals" className="relative">
                             Approvals
                             <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                         </TabsTrigger>
                    )}
                </TabsList>

                {/* My Requests Tab */}
                <TabsContent value="my-requests" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>My History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {myRequests.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">No leave requests found.</p>
                                ) : (
                                    myRequests.map((req: any) => (
                                        <div key={req.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium leading-none">
                                                    {req.leaveType?.name}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {format(new Date(req.startDate), "MMM dd")} - {format(new Date(req.endDate), "MMM dd, yyyy")}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={
                                                    req.status === 'APPROVED' ? 'default' : 
                                                    req.status === 'REJECTED' ? 'destructive' : 'secondary'
                                                }>
                                                    {req.status}
                                                </Badge>
                                                {req.status === 'PENDING' && req.approver && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Approver: {req.approver.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
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
