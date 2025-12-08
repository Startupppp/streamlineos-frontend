import { auth, clerkClient } from "@clerk/nextjs/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, CalendarCheck, CreditCard } from "lucide-react";
import { db } from "@/lib/db";
import { projects, attendance } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { format } from "date-fns";

export default async function DashboardPage() {
  const { orgId, userId } = await auth();
  
  if (!orgId) {
      return <div>Please select an organization.</div>;
  }

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });
  const memberships = await client.organizations.getOrganizationMembershipList({ organizationId: orgId });
  
  // Fetch DB Stats
  const activeProjectsCount = (await db.query.projects.findMany({
      where: eq(projects.orgId, orgId)
  })).length;

  const today = format(new Date(), "yyyy-MM-dd");
  const presentCount = (await db.query.attendance.findMany({
      where: and(eq(attendance.orgId, orgId), eq(attendance.date, today))
  })).length;

  const stats = [
    {
      label: "Total Employees",
      value: memberships.totalCount,
      icon: Users,
      color: "text-pink-500",
    },
    {
      label: "Active Projects",
      value: activeProjectsCount,
      icon: Briefcase,
      color: "text-violet-500",
    },
    {
      label: "Present Today",
      value: presentCount,
      icon: CalendarCheck,
      color: "text-emerald-500",
    },
    {
       label: "Organization ID",
       value: org.slug || orgId.slice(0, 8),
       icon: CreditCard,
       color: "text-zinc-500"
    }
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard</h2>
        <p className="text-zinc-400">Overview for {org.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Recent Activity / Charts could go here */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-white/5 border-white/10">
            <CardHeader>
                <CardTitle className="text-white">Recent Projects</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-zinc-400 text-sm">No recent activity.</p>
            </CardContent>
        </Card>
        <Card className="col-span-3 bg-white/5 border-white/10">
            <CardHeader>
                <CardTitle className="text-white">Team Availability</CardTitle>
            </CardHeader>
             <CardContent>
                <p className="text-zinc-400 text-sm">Everyone is offline.</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
