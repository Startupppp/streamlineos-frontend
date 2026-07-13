import Link from "next/link";
import { Mail, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types/hr";

interface EmployeeCardProps {
  employee: Employee;
  department: string | null;
}

export function EmployeeCard({ employee: emp, department }: EmployeeCardProps) {
  const displayName =
    emp.firstName && emp.lastName
      ? `${emp.firstName} ${emp.lastName}`
      : (emp.name ?? "—");
  const initial = (emp.firstName?.[0] ?? emp.name?.[0] ?? "?").toUpperCase();

  return (
    <Link href={`/hr/employees/${emp.id}`} className="block group">
      <Card
        className={cn(
          "h-full cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4",
          emp.isActive ? "border-l-emerald-500" : "border-l-border",
        )}
      >
        <CardContent className="p-4 flex flex-col items-center text-center gap-3">
          <Avatar className="h-16 w-16 mt-1 ring-2 ring-border transition-transform duration-200 group-hover:scale-105">
            <AvatarImage src={resolveImageUrl(emp.image)} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="w-full space-y-0.5">
            <p className="font-semibold text-sm leading-tight truncate text-foreground">
              {displayName}
            </p>
            {emp.designation && (
              <p className="text-[11px] text-muted-foreground truncate">
                {emp.designation}
              </p>
            )}
          </div>
          {department && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-foreground border-primary/30 max-w-full">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{department}</span>
            </span>
          )}
          {emp.email && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground w-full justify-center min-w-0">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{emp.email}</span>
            </div>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              emp.isActive
                ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                : "bg-muted text-muted-foreground border-border",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                emp.isActive ? "bg-emerald-500" : "bg-muted-foreground/50",
              )}
            />
            {emp.isActive ? "Active" : "Inactive"}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
