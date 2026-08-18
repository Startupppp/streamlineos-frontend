import { RefreshCw, ShieldOff, UserCog, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";

interface UserBulkActionsBarProps {
  selectedUserCount: number;
  canManage: boolean;
  isSuspending: boolean;
  isArchiving: boolean;
  isRestoring: boolean;
  onSuspend: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onAssign: () => void;
  onClear: () => void;
}

export function UserBulkActionsBar({
  selectedUserCount,
  canManage,
  isSuspending,
  isArchiving,
  isRestoring,
  onSuspend,
  onArchive,
  onRestore,
  onAssign,
  onClear,
}: UserBulkActionsBarProps) {
  const lifecycleMutationPending = isSuspending || isArchiving || isRestoring;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/60 px-3 py-2 text-xs">
      <span className="font-medium text-muted-foreground">
        {selectedUserCount} selected
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {canManage && (
          <LoadingButton
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={onSuspend}
            isPending={isSuspending}
            disabled={lifecycleMutationPending}
          >
            <ShieldOff className="mr-1 h-3 w-3" />
            Suspend
          </LoadingButton>
        )}
        {canManage && (
          <LoadingButton
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={onArchive}
            isPending={isArchiving}
            disabled={lifecycleMutationPending}
          >
            <UserX className="mr-1 h-3 w-3" />
            Archive
          </LoadingButton>
        )}
        {canManage && (
          <LoadingButton
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={onRestore}
            isPending={isRestoring}
            disabled={lifecycleMutationPending}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Restore
          </LoadingButton>
        )}
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={onAssign}
            disabled={lifecycleMutationPending}
          >
            <UserCog className="mr-1 h-3 w-3" />
            Assign
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
