import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { resolveImageUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types/hr";

interface EmployeeRowProps {
  employee: Employee;
  department: string | null;
}

export function EmployeeRow({ employee: emp, department }: EmployeeRowProps) {
  const displayName =
    emp.firstName && emp.lastName
      ? `${emp.firstName} ${emp.lastName}`
      : (emp.name ?? "—");

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell>
        <Link
          href={`/hr/employees/${emp.id}`}
          className="flex items-center gap-3"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={resolveImageUrl(emp.image)} />
            <AvatarFallback className="bg-blue-500/10 text-blue-600 text-xs font-semibold">
              {displayName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
            {emp.employeeId && (
              <p className="text-[11px] text-muted-foreground">
                {emp.employeeId}
              </p>
            )}
          </div>
        </Link>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {emp.designation ?? "—"}
      </TableCell>
      <TableCell>
        {department ? (
          <Badge variant="secondary" className="text-[10px] h-5 px-2">
            {department}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]">
        {emp.email}
      </TableCell>
      <TableCell>
        <span
          className={cn(
            "inline-block text-[9px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 border",
            emp.isActive
              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
              : "bg-muted text-muted-foreground border-border",
          )}
        >
          {emp.isActive ? "Active" : "Inactive"}
        </span>
      </TableCell>
    </TableRow>
  );
}
