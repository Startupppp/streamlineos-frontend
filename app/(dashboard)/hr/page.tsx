import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Users, Clock, CalendarCheck, CreditCard } from "lucide-react";
import Link from "next/link";
import { auth } from "../../../lib/auth";

export default async function HROverviewPage() {
  const session = await auth();
  
  if (!session) {
    return null;
  }

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
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          HR Management
        </h2>
        <p className="text-muted-foreground">
          Manage your organization&apos;s workforce.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">
                  {mod.label}
                </CardTitle>
                <mod.icon className={`h-4 w-4 ${mod.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{mod.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* TODO: Add Dashboard Stats here (Total Employees, On Leave Today, etc) */}
    </div>
  );
}
