"use client";

import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OrgSettingsCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  titleExtra?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
}

export function OrgSettingsCard({
  title,
  description,
  icon,
  titleExtra,
  action,
  children,
  className,
  contentClassName,
  headerClassName,
  titleClassName,
}: OrgSettingsCardProps) {
  return (
    <Card className={cn("rounded-lg shadow-sm", className)}>
      <CardHeader
        className={cn(
          "gap-1 px-4 pt-3.5 pb-2",
          action && "grid-cols-[1fr_auto]",
          headerClassName,
        )}
      >
        <div className="min-w-0 space-y-0.5">
          <CardTitle
            className={cn(
              "text-sm font-semibold flex items-center gap-2",
              titleClassName,
            )}
          >
            {icon}
            <span className="truncate">{title}</span>
            {titleExtra}
          </CardTitle>
          {description ? (
            <CardDescription className="text-xs leading-relaxed">
              {description}
            </CardDescription>
          ) : null}
        </div>
        {action ? <CardAction className="self-start">{action}</CardAction> : null}
      </CardHeader>
      <CardContent className={cn("px-4 pb-3.5 pt-0", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

interface SettingsFieldProps {
  label: string;
  value?: ReactNode;
  empty?: string;
  className?: string;
  children?: ReactNode;
}

export function SettingsField({
  label,
  value,
  empty = "Not set",
  className,
  children,
}: SettingsFieldProps) {
  const hasValue =
    value !== null &&
    value !== undefined &&
    value !== "" &&
    !(typeof value === "string" && value.trim() === "");

  return (
    <div className={cn("min-w-0 space-y-0.5", className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children ?? (
        <p className="text-sm text-foreground truncate">
          {hasValue ? value : <span className="text-muted-foreground">{empty}</span>}
        </p>
      )}
    </div>
  );
}

interface SettingsFieldGridProps {
  children: ReactNode;
  className?: string;
  cols?: 2 | 3;
}

export function SettingsFieldGrid({
  children,
  className,
  cols = 3,
}: SettingsFieldGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2",
        cols === 3 && "lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface OrgSettingsEditButtonProps {
  onClick: () => void;
  label?: string;
}

export function OrgSettingsEditButton({
  onClick,
  label = "Edit",
}: OrgSettingsEditButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-7 gap-1.5 px-2.5 text-xs shrink-0"
    >
      <Pencil className="h-3 w-3" />
      {label}
    </Button>
  );
}

interface OrgSettingsFormActionsProps {
  onCancel: () => void;
  isPending?: boolean;
  children: ReactNode;
  className?: string;
}

export function OrgSettingsFormActions({
  onCancel,
  isPending,
  children,
  className,
}: OrgSettingsFormActionsProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 pt-1 sm:flex-row sm:items-center [&_button]:w-full sm:[&_button]:w-auto",
        className,
      )}
    >
      {children}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8"
        onClick={onCancel}
        disabled={isPending}
      >
        Cancel
      </Button>
    </div>
  );
}

interface OrgSettingsActionRowProps {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  showBorder?: boolean;
  destructive?: boolean;
}

export function OrgSettingsActionRow({
  title,
  description,
  children,
  className,
  showBorder = true,
  destructive = false,
}: OrgSettingsActionRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        showBorder && "border-b border-border last:border-b-0",
        className,
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <p className={cn("text-sm font-medium", destructive && "text-destructive")}>{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0 sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
        {children}
      </div>
    </div>
  );
}
