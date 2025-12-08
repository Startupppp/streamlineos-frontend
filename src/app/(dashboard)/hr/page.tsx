import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, CalendarCheck, CreditCard } from "lucide-react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function HROverviewPage() {
  const { orgId } = await auth();

  const modules = [
    {
      label: "Employees",
      href: "/hr/employees",
      icon: Users,
      color: "text-pink-700",
      description: "Manage employee directory and profiles",
    },
    {
      label: "Attendance",
      href: "/hr/attendance",
      icon: Clock,
      color: "text-orange-700",
      description: "Track daily attendance and work hours",
    },
    {
      label: "Leave Management",
      href: "/hr/leaves",
      icon: CalendarCheck,
      color: "text-emerald-500",
      description: "Approve requests and view balances",
    },
    {
      label: "Payroll",
      href: "/hr/payroll",
      icon: CreditCard,
      color: "text-green-700",
      description: "Generate payslips and manage salaries",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">HR Management</h2>
        <p className="text-zinc-400">Manage your organization's workforce.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <Card className="hover:bg-white/5 transition-colors cursor-pointer border-white/10 bg-white/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">{mod.label}</CardTitle>
                <mod.icon className={`h-4 w-4 ${mod.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-zinc-400">{mod.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      
      {/* TODO: Add Dashboard Stats here (Total Employees, On Leave Today, etc) */}
    </div>
  );
}
