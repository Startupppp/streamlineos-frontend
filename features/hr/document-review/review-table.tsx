"use client";

import { useCallback } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface EmployeeDocSummary {
  userId: string;
  userName: string | null;
  userImage: string | null;
  designation: string | null;
  employeeId: string | null;
  totalRequired: number;
  totalSubmitted: number;
  totalApproved: number;
  totalRejected: number;
  onboardingDocStatus: string | null;
}

interface ReviewTableProps {
  list: EmployeeDocSummary[];
  canReview: boolean;
  onOpenReview: (emp: EmployeeDocSummary) => void;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function overallStatusVariant(
  status: string | null
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "APPROVED":
      return "default";
    case "SUBMITTED":
    case "IN_PROGRESS":
      return "secondary";
    case "PENDING":
      return "outline";
    default:
      return "outline";
  }
}

function ProgressBar({ approved, total }: { approved: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((approved / total) * 100);
  const label =
    total === 0
      ? "No required documents configured"
      : `${approved} of ${total} required document${total === 1 ? "" : "s"} approved`;
  return (
    <div className="flex flex-col gap-1 min-w-[160px]">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          className="text-[11px] text-muted-foreground tabular-nums shrink-0"
          aria-label={label}
        >
          {approved}/{total}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
    </div>
  );
}

export function ReviewTable({ list, canReview, onOpenReview }: ReviewTableProps) {
  const handleOpenReview = useCallback(
    (emp: EmployeeDocSummary) => {
      onOpenReview(emp);
    },
    [onOpenReview]
  );

  if (list.length === 0) {
    return (
      <EmptyState
        illustration={<EmptyDocumentsIllustration className="h-40 w-40" />}
        title="No documents to review"
        description="Once employees submit onboarding documents, they will appear here."
      />
    );
  }

  return (
    <ScrollArea className="w-full" type="auto">
      <div className="min-w-[640px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((emp) => (
              <TableRow key={emp.userId}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8 shrink-0">
                      {emp.userImage && (
                        <AvatarImage src={emp.userImage} alt={emp.userName ?? "Employee"} />
                      )}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(emp.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{emp.userName ?? "Unknown"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {emp.designation ?? "—"}
                        {emp.employeeId ? ` · ${emp.employeeId}` : ""}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <ProgressBar approved={emp.totalApproved} total={emp.totalRequired} />
                </TableCell>
                <TableCell>
                  <Badge
                    variant={overallStatusVariant(emp.onboardingDocStatus)}
                    className="text-[10px]"
                  >
                    {emp.onboardingDocStatus ?? "PENDING"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => handleOpenReview(emp)}
                    aria-label={`${canReview ? "Review" : "View"} documents for ${emp.userName}`}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    {canReview ? "Review" : "View"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
}
