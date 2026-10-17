"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import type { TestCasePriority, TestResultStatus } from "@/types/projects";

interface ResultStatusOption {
  value: TestResultStatus;
  label: string;
  activeClass: string;
}

const STATUS_OPTIONS: readonly ResultStatusOption[] = [
  { value: "not_run", label: "Not Run", activeClass: "bg-muted text-foreground border-border" },
  { value: "passed", label: "Pass", activeClass: "bg-status-success-surface text-status-success-ink-strong border-status-success-rule" },
  { value: "failed", label: "Fail", activeClass: "bg-status-danger-surface text-status-danger-ink-strong border-status-danger-rule" },
  { value: "blocked", label: "Blocked", activeClass: "bg-status-warning-surface text-status-warning-ink-strong border-status-warning-rule" },
  { value: "skipped", label: "Skip", activeClass: "bg-muted text-muted-foreground border-border" },
];

export const PRIORITY_STYLES: Record<TestCasePriority, string> = {
  low: "text-muted-foreground border-border",
  medium: "text-status-warning-ink-strong border-status-warning-rule",
  high: "text-status-danger-ink-strong border-status-danger-rule",
};

export function linkedBugHref(projectId: number, ticketId: number): string {
  return `/build/${projectId}/issues?type=BUG&ticket=${ticketId}`;
}

interface ResultStatusButtonProps {
  option: ResultStatusOption;
  isActive: boolean;
  disabled: boolean;
  className?: string;
  onSelect: (status: TestResultStatus) => void;
}

function ResultStatusButton({ option, isActive, disabled, className, onSelect }: ResultStatusButtonProps) {
  const handleClick = useCallback(() => onSelect(option.value), [onSelect, option.value]);
  return (
    <button
      type="button"
      aria-pressed={isActive}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "rounded border py-0.5 text-micro transition-colors",
        isActive
          ? option.activeClass
          : "border-border text-muted-foreground hover:bg-primary/[0.04] disabled:opacity-50",
        className,
      )}
    >
      {option.label}
    </button>
  );
}

interface ResultStatusButtonsProps {
  status: TestResultStatus;
  disabled: boolean;
  onSelect: (status: TestResultStatus) => void;
  buttonClassName?: string;
}

export function ResultStatusButtons({ status, disabled, onSelect, buttonClassName = "px-1.5" }: ResultStatusButtonsProps) {
  return (
    <>
      {STATUS_OPTIONS.map((option) => (
        <ResultStatusButton
          key={option.value}
          option={option}
          isActive={status === option.value}
          disabled={disabled}
          className={buttonClassName}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}
