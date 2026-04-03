"use client";

import { useState } from "react";
import { useHrPerformanceReviews, useHrGoals } from "@/lib/api/hooks/hr";
import type { PerformanceReview, Goal } from "@/types/hr";

type ReviewWithUsers = PerformanceReview & {
  reviewee?: { name?: string | null } | null;
  reviewer?: { name?: string | null } | null;
  overallScore?: number | null;
};
import { format } from "date-fns";
import {
  Plus,
  Loader2,
  Star,
  Target,
  Users,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DashboardGate } from "@/components/shared/dashboard-gate";

export default function PerformancePage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <PerformanceContent />
    </DashboardGate>
  );
}

function PerformanceContent() {
  const [tab, setTab] = useState("reviews");

  return (
    <div className="flex-1 space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Performance Management</h2>
        <p className="text-sm text-muted-foreground">Reviews, goals, and team development</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="reviews" className="gap-1.5"><Star className="h-3.5 w-3.5" /> Reviews</TabsTrigger>
          <TabsTrigger value="goals" className="gap-1.5"><Target className="h-3.5 w-3.5" /> Goals</TabsTrigger>
          <TabsTrigger value="oneOnOnes" className="gap-1.5"><Users className="h-3.5 w-3.5" /> 1-on-1s</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-4 mt-4"><ReviewsTab /></TabsContent>
        <TabsContent value="goals" className="space-y-4 mt-4"><GoalsTab /></TabsContent>
        <TabsContent value="oneOnOnes" className="space-y-4 mt-4"><OneOnOnesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ReviewsTab() {
  const { data: reviews, isLoading } = useHrPerformanceReviews();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Performance Reviews</h3>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5 bg-[#bd882c] hover:bg-[#bd882c]/90 text-white">
          <Plus className="h-3.5 w-3.5" /> New Review
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : !reviews || (Array.isArray(reviews) && reviews.length === 0) ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Star className="h-10 w-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No performance reviews yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Start a review cycle to evaluate team performance</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(Array.isArray(reviews) ? reviews : []).map((review: ReviewWithUsers) => (
            <Card key={review.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={review.status === "ACKNOWLEDGED" ? "default" : "secondary"} className="text-xs">
                    {review.status ?? "DRAFT"}
                  </Badge>
                  {(review.overallScore ?? 0) > 0 && (
                    <div className="flex items-center gap-1 text-[#bd882c]">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="text-sm font-bold">{review.overallScore}/5</span>
                    </div>
                  )}
                </div>
                <p className="text-sm font-semibold">{review.reviewee?.name ?? "Employee"}</p>
                <p className="text-xs text-muted-foreground">Reviewed by {review.reviewer?.name ?? "Manager"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Schedule Performance Review</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Performance review scheduling will be available once review cycles are configured.</p>
          <Button variant="outline" onClick={() => setCreateOpen(false)} className="w-full">Close</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function GoalsTab() {
  const { data: goals, isLoading } = useHrGoals();

  return (
    <>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Team Goals</h3>
        <Button size="sm" className="gap-1.5 bg-[#bd882c] hover:bg-[#bd882c]/90 text-white">
          <Plus className="h-3.5 w-3.5" /> New Goal
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : !goals || (Array.isArray(goals) && goals.length === 0) ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Target className="h-10 w-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No goals set yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Create goals to track team objectives and key results</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(Array.isArray(goals) ? goals : []).map((goal: Goal) => (
            <Card key={goal.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={goal.status === "COMPLETED" ? "default" : "secondary"} className="text-xs">
                    {(goal.status ?? "IN_PROGRESS").replace("_", " ")}
                  </Badge>
                  {goal.endDate && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(goal.endDate), "MMM d")}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold">{goal.title}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{goal.progress ?? 0}%</span>
                  </div>
                  <Progress value={goal.progress ?? 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function OneOnOnesTab() {
  return (
    <>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">1-on-1 Meetings</h3>
        <Button size="sm" className="gap-1.5 bg-[#bd882c] hover:bg-[#bd882c]/90 text-white">
          <Plus className="h-3.5 w-3.5" /> Schedule 1-on-1
        </Button>
      </div>
      <Card className="flex flex-col items-center justify-center py-16">
        <Users className="h-10 w-10 text-muted-foreground/20 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No 1-on-1 meetings scheduled</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Schedule regular check-ins with your team members</p>
      </Card>
    </>
  );
}
