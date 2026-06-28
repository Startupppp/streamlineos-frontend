"use client";

import { useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, ShieldOff } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import { ALL_ROLES, ROLE_COLORS } from "./role-constants";

interface MemberTableRowProps {
  member: {
    userId: string;
    name: string | null;
    email: string;
    image?: string | null;
    role: string;
    joinedAt?: string | Date | null;
    totpEnabled?: boolean;
  };
  onUpdateRole: (userId: string, newRole: string, currentRole: string) => void;
  onResetMfa: (userId: string) => void;
  canManageMfa: boolean;
  isResettingMfa: boolean;
}

export function MemberTableRow({
  member,
  onUpdateRole,
  onResetMfa,
  canManageMfa,
  isResettingMfa,
}: MemberTableRowProps) {
  const handleRoleChange = useCallback(
    (newRole: string) => onUpdateRole(member.userId, newRole, member.role),
    [member.userId, member.role, onUpdateRole],
  );
  const handleResetMfa = useCallback(
    () => onResetMfa(member.userId),
    [member.userId, onResetMfa],
  );

  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={resolveImageUrl(member.image)} />
            <AvatarFallback className="text-xs bg-blue-500/10 text-blue-600">
              {member.name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium">{member.name || "Unknown"}</span>
            {member.totpEnabled && (
              <Shield className="h-3 w-3 text-green-500" aria-label="MFA enabled" />
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="px-5 py-3.5 text-sm text-muted-foreground">
        {member.email}
      </TableCell>
      <TableCell className="px-5 py-3.5">
        <Badge
          variant="outline"
          className={`text-[11px] border ${ROLE_COLORS[member.role] || ""}`}
        >
          {member.role}
        </Badge>
      </TableCell>
      <TableCell className="px-5 py-3.5 text-sm text-muted-foreground">
        {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("en-IN") : "—"}
      </TableCell>
      <TableCell className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-2">
          {canManageMfa && member.totpEnabled && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={isResettingMfa}
                >
                  <ShieldOff className="h-3 w-3 mr-1" />
                  Reset MFA
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Reset MFA for {member.name || member.email}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will disable two-factor authentication for this user. They will need
                    to re-enable it to regain MFA protection.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleResetMfa}
                  >
                    Reset MFA
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Select value={member.role} onValueChange={handleRoleChange}>
            <SelectTrigger className="ml-auto h-8 w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value} className="text-xs">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </TableCell>
    </TableRow>
  );
}
