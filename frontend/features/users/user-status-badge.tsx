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
      <Badge variant="outline" className={cn("text-dense border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10", className)}>
        Archived
      </Badge>
    );
  }
  if (isActive) {
    return (
      <Badge variant="outline" className={cn("text-dense border-green-200 dark:border-green-500/30 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10", className)}>
        Active
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("text-dense border-yellow-200 dark:border-yellow-500/30 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10", className)}>
      Suspended
    </Badge>
  );
}
