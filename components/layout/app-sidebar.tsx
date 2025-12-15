"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cn } from "../../lib/utils";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Settings,
  Clock,
  CalendarCheck,
  CreditCard,
  LogOut,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useGetOrganizations } from "../../lib/hooks/auth-hooks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

const adminRoutes = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", color: "text-sky-500" },
  { label: "Employees", icon: Users, href: "/hr", color: "text-pink-700" },
  { label: "Payroll", icon: CreditCard, href: "/hr/payroll", color: "text-green-700" },
  { label: "Projects", icon: Briefcase, href: "/projects", color: "text-violet-500" },
  { label: "Settings", icon: Settings, href: "/settings", color: "text-gray-500" },
];

const hrRoutes = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", color: "text-sky-500" },
  { label: "Onboarding", icon: Users, href: "/hr/onboarding", color: "text-pink-700" },
  { label: "Attendance", icon: Clock, href: "/hr/attendance", color: "text-orange-700" },
  { label: "Leaves", icon: CalendarCheck, href: "/hr/leaves", color: "text-emerald-500" },
  { label: "Payroll", icon: CreditCard, href: "/hr/payroll", color: "text-green-700" },
];

const employeeRoutes = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", color: "text-sky-500" },
  { label: "My Projects", icon: Briefcase, href: "/projects", color: "text-violet-500" },
  { label: "My Attendance", icon: Clock, href: "/hr/attendance", color: "text-orange-700" },
  { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves", color: "text-emerald-500" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { data: organizations } = useGetOrganizations();
  
  const role = session?.user?.role;

  let routes = employeeRoutes; // Default to employee
  if (role === "OWNER" || role === "ADMIN") {
    routes = [...adminRoutes, ...hrRoutes.filter(r => !adminRoutes.some(ar => ar.href === r.href))]; 
  } else if (role === "MEMBER") {
     routes = employeeRoutes;
  }

  const handleOrgChange = (id: string) => {
    // Store selected org in session or context
    console.log("Org switched to", id);
    router.push("/dashboard");
    router.refresh();
  };


  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="px-3 py-2 flex-1">
        <Link href="/dashboard" className="flex items-center pl-3 mb-6">
          <div className="relative w-8 h-8 mr-4">
            <Image
              src="/logo.svg"
              alt="Vaivamm Logo"
              width={32}
              height={32}
              className="rounded-lg"
            />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">
            Vaivamm
          </h1>
        </Link>

        {organizations && organizations.length > 0 && (
          <div className="px-3 mb-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground p-2 rounded-lg border-sidebar-border bg-transparent"
                >
                  <span className="truncate">
                    {organizations[0]?.name || "Select Organization"}
                  </span>
                  <span className="ml-2">▼</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Organizations</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {organizations.map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    onClick={() => handleOrgChange(org.id)}
                  >
                    {org.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/org-selection")}>
                  Manage Organizations
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition",
                pathname === route.href
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  : "text-sidebar-foreground/70"
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="px-3 py-2 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-x-3 p-3 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback>
                  {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden text-left">
                <span className="font-semibold text-sidebar-foreground truncate">
                  {session?.user?.name || "User"}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {session?.user?.email}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                signOut({ callbackUrl: "/signin" });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
