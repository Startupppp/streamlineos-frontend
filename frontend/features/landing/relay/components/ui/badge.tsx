import { PulseDot } from "./pulse-dot";

export interface BadgeProps {
  label: string;
  className?: string;
}

export const Badge = ({ label, className = "" }: BadgeProps) => (
  <span
    className={`inline-flex items-center gap-2 overflow-clip rounded-full border border-border-subtle bg-surface-badge py-1.25 pr-3.25 pl-2.75 shadow-float w1024:py-1.75 w1024:pr-3.75 w1024:pl-2.75 ${className}`}
  >
    <PulseDot />
    <span className="text-relay-label leading-label font-medium tracking-badge whitespace-nowrap text-foreground-muted">
      {label}
    </span>
  </span>
);
