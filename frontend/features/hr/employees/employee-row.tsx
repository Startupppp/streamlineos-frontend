import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import { TruncatedText } from "@/components/ui/truncated-text";
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
    <TableRow className="hover:bg-muted/50 transition-colors duration-200 group">
      <TableCell>
        <Link
          href={`/hr/employees/${emp.id}`}
          className="flex items-center gap-3"
        >
          <Avatar className="w-8 shrink-0">
            <AvatarImage src={resolveImageUrl(emp.image)} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {displayName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <TruncatedText
              text={displayName}
              className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-200"
            />
            {emp.email && (
              <TruncatedText
                text={emp.email}
                className="text-[11px] text-muted-foreground"
              />
            )}
          </div>
        </Link>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground font-mono">
        {emp.employeeId ?? "—"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {emp.designation ?? "—"}
      </TableCell>
      <TableCell>
        {department ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-foreground border-primary/30">
            {department}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground truncate max-w-[180px]">
        {emp.email}
      </TableCell>
      <TableCell>
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
      </TableCell>
    </TableRow>
  );
}
