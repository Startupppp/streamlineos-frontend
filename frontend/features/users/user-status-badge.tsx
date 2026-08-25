import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UserStatusBadgeProps {
  isActive: boolean;
  isDeleted?: boolean;
  className?: string;
}

export function UserStatusBadge({ isActive, isDeleted, className }: UserStatusBadgeProps) {
  if (isDeleted) {
    return (
      <Badge variant="outline" className={cn("text-dense border-status-danger-rule text-status-danger-ink bg-status-danger-surface", className)}>
        Archived
      </Badge>
    );
  }
  if (isActive) {
    return (
      <Badge variant="outline" className={cn("text-dense border-status-success-rule text-status-success-ink bg-status-success-surface", className)}>
        Active
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("text-dense border-status-warning-rule text-status-warning-ink bg-status-warning-surface", className)}>
      Suspended
    </Badge>
  );
}
