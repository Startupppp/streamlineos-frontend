"use client";

import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { ROLE_COLORS } from "./role-constants";

export interface InvitationRowProps {
  inv: { id: string; email: string; role: string };
  onCancel: (id: string) => void;
  onResend: (id: string) => void;
  isResending: boolean;
}

export function InvitationRow({ inv, onCancel, onResend, isResending }: InvitationRowProps) {
  const handleCancel = useCallback(() => onCancel(inv.id), [inv.id, onCancel]);
  const handleResend = useCallback(() => onResend(inv.id), [inv.id, onResend]);

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <p className="text-sm font-medium">{inv.email}</p>
        <Badge
          variant="outline"
          className={`text-[10px] mt-1 ${ROLE_COLORS[inv.role] || ""}`}
        >
          {inv.role}
        </Badge>
      </div>
      <div className="flex gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={handleResend}
          disabled={isResending}
          aria-label="Resend invitation"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Resend
        </Button>
        <Button variant="ghost" size="sm" className="text-xs" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
