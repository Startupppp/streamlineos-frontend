import { Download, Upload, UserPlus, Users } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserDirectoryActionsProps {
  canCreate: boolean;
  canExport: boolean;
  isExporting: boolean;
  onExport: () => void;
  onImport: () => void;
  onBulkInvite: () => void;
  onInvite: () => void;
}

export function UserDirectoryActions({
  canCreate,
  canExport,
  isExporting,
  onExport,
  onImport,
  onBulkInvite,
  onInvite,
}: UserDirectoryActionsProps) {
  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-nowrap sm:justify-end">
      {(canExport || canCreate) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <AnimatedIconButton
              icon={EllipsisIcon}
              iconClassName="mr-1.5"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
            >
              More
            </AnimatedIconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {canExport && (
              <DropdownMenuItem onClick={onExport} disabled={isExporting}>
                <Download className="mr-2 h-3.5 w-3.5" />
                Export CSV
              </DropdownMenuItem>
            )}
            {canCreate && (
              <DropdownMenuItem onClick={onImport}>
                <Upload className="mr-2 h-3.5 w-3.5" />
                Import CSV
              </DropdownMenuItem>
            )}
            {canCreate && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onBulkInvite}>
                  <Users className="mr-2 h-3.5 w-3.5" />
                  Bulk Invite
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {canCreate && (
        <Button size="sm" className="w-full sm:w-auto" onClick={onInvite}>
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Invite User
        </Button>
      )}
    </div>
  );
}
