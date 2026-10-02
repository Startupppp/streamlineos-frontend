"use client";

import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatRoleLabel } from "@/lib/constants/user-invite-roles";
import { MODULE_CATALOG } from "../lib/constants";
import { effectiveInviteModuleAccess } from "../lib/setup-payload";
import type { Invitee, OrgModuleKey } from "../lib/wizard-data-schema";

type InviteeAccessRowProps = {
  invitee: Invitee;
  index: number;
  selectedModules: readonly OrgModuleKey[];
  isPending: boolean;
  onRemove: (email: string) => void;
  onAccessChange: (email: string, moduleKey: OrgModuleKey, standing: string) => void;
  onRemoveUnavailableAccess: (email: string) => void;
};

function moduleLabel(moduleKey: OrgModuleKey): string {
  return (
    MODULE_CATALOG[moduleKey]?.label ??
    moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1)
  );
}

export function InviteeAccessRow({
  invitee,
  index,
  selectedModules,
  isPending,
  onRemove,
  onAccessChange,
  onRemoveUnavailableAccess,
}: InviteeAccessRowProps) {
  const reduceMotion = useReducedMotion();
  const access = effectiveInviteModuleAccess(invitee, selectedModules);
  const selected = new Set(selectedModules);
  const unavailable = access.filter((item) => !selected.has(item.moduleKey));

  return (
    <motion.li
      initial={{ opacity: 0, x: reduceMotion ? 0 : -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2, ease: "easeOut" }}
      className="min-w-0 rounded-lg border border-border bg-card p-2.5"
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <TruncatedText
          text={invitee.email}
          className="min-w-0 text-label font-semibold leading-none text-foreground"
        />
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {formatRoleLabel(invitee.role)}
          </span>
          <button
            type="button"
            onClick={() => onRemove(invitee.email)}
            disabled={isPending}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
            aria-label={`Remove ${invitee.email}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {invitee.role === "ORG_ADMIN"
          ? "Access: all enabled products as Org Admin"
          : access.length === 0
            ? "Access: no products until assigned"
            : `Access: ${access.map((item) => `${moduleLabel(item.moduleKey)} ${formatRoleLabel(item.standing)}`).join(", ")}`}
      </p>
      {invitee.role === "MEMBER" && selectedModules.length > 0 && (
        <details className="mt-2 text-xs">
          <summary className="w-fit cursor-pointer font-medium text-foreground">
            Edit product access for {invitee.email}
          </summary>
          <div className="mt-2 space-y-2">
            {selectedModules.map((moduleKey) => (
              <div key={moduleKey} className="flex items-center justify-between gap-2">
                <span>{moduleLabel(moduleKey)}</span>
                <Select
                  value={access.find((item) => item.moduleKey === moduleKey)?.standing ?? "NONE"}
                  onValueChange={(value) => onAccessChange(invitee.email, moduleKey, value)}
                  disabled={isPending}
                >
                  <SelectTrigger
                    className="h-9 w-32 text-sm"
                    aria-label={`${moduleLabel(moduleKey)} access for ${invitee.email}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No access</SelectItem>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </details>
      )}
      {unavailable.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-destructive">
          <span>
            {unavailable.map((item) => moduleLabel(item.moduleKey)).join(", ")} no longer selected.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRemoveUnavailableAccess(invitee.email)}
            disabled={isPending}
          >
            Remove unavailable access
          </Button>
        </div>
      )}
    </motion.li>
  );
}
