import Link from "next/link";
import { Mail, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
      <Card className="h-full cursor-pointer transition-all duration-200 hover:border-blue-400 hover:shadow-[0_8px_24px_-8px_rgba(59,130,246,0.18)] hover:-translate-y-0.5">
        <CardContent className="p-4 flex flex-col items-center text-center gap-2">
          <Avatar className="h-14 w-14 mt-1 ring-2 ring-card transition-transform duration-200 group-hover:scale-105">
            <AvatarImage src={resolveImageUrl(emp.image)} />
            <AvatarFallback className="bg-blue-500/10 text-blue-600 text-base font-semibold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="w-full">
            <p className="font-semibold text-sm leading-tight truncate">
              {displayName}
            </p>
            {emp.designation && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {emp.designation}
              </p>
            )}
          </div>
          {department && (
            <Badge
              variant="secondary"
              className="text-[10px] h-5 px-2 truncate max-w-full"
            >
              <Building2 className="h-3 w-3 mr-1 shrink-0" />
              {department}
            </Badge>
          )}
          {emp.email && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground w-full justify-center truncate">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{emp.email}</span>
            </div>
          )}
          <span
            className={cn(
              "text-[9px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 border",
              emp.isActive
                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                : "bg-muted text-muted-foreground border-border",
            )}
          >
            {emp.isActive ? "Active" : "Inactive"}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
