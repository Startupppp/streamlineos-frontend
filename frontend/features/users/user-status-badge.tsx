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
      <Badge variant="outline" className={cn("text-[11px] border-red-200 text-red-600 bg-red-50", className)}>
        Archived
      </Badge>
    );
  }
  if (isActive) {
    return (
      <Badge variant="outline" className={cn("text-[11px] border-green-200 text-green-600 bg-green-50", className)}>
        Active
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("text-[11px] border-yellow-200 text-yellow-600 bg-yellow-50", className)}>
      Suspended
    </Badge>
  );
}
