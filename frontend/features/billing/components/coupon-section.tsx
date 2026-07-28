"use client";

import { forwardRef } from "react";
import { Check, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import type { CouponValidationResult } from "@/hooks/api/subscription";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { XIcon } from "@animateicons/react/lucide";

const RemoveCouponButton = forwardRef<HTMLButtonElement, { onClick: () => void }>(
  ({ onClick }, ref) => {
    const { iconRef, hoverHandlers } = useAnimatedIcon();
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 rounded"
        aria-label="Remove coupon"
        {...hoverHandlers}
      >
        <XIcon ref={iconRef} size={16} />
      </button>
    );
  }
);
RemoveCouponButton.displayName = "RemoveCouponButton";

function CouponIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g transform="translate(40 42) rotate(-18)">
        <rect x="-22" y="-16" width="44" height="32" rx="6" fill="#8b5cf6" />
        <circle cx="-22" cy="0" r="4" fill="white" />
        <circle cx="22" cy="0" r="4" fill="white" />
        <text x="0" y="6" textAnchor="middle" fontSize="16" fontWeight="700" fill="white">
          %
        </text>
      </g>
      <rect x="8" y="10" width="7" height="7" rx="2" fill="#3b82f6" opacity="0.6" transform="rotate(20 11 13)" />
      <circle cx="66" cy="18" r="4" fill="#f59e0b" opacity="0.7" />
      <circle cx="12" cy="60" r="3" fill="#10b981" opacity="0.7" />
      <rect x="60" y="54" width="6" height="6" rx="1.5" fill="#8b5cf6" opacity="0.5" transform="rotate(-15 63 57)" />
    </svg>
  );
}

interface CouponSectionProps {
  couponInput: string;
  appliedCoupon: CouponValidationResult | null;
  couponResult: CouponValidationResult | undefined;
  isValidatingCoupon: boolean;
  helperText?: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onApply: () => void;
  onRemove: () => void;
}

export function CouponSection({
  couponInput,
  appliedCoupon,
  couponResult,
  isValidatingCoupon,
  helperText,
  onInputChange,
  onApply,
  onRemove,
}: CouponSectionProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Have a coupon code?</p>
          </div>
          {appliedCoupon ? (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 px-3 py-2">
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-700 dark:text-emerald-300 flex-1">{appliedCoupon.message}</p>
              <RemoveCouponButton onClick={onRemove} />
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={couponInput}
                onChange={onInputChange}
                placeholder="Enter coupon code"
                className="max-w-xs font-mono uppercase text-sm"
                aria-label="Coupon code"
              />
              <LoadingButton
                variant="outline"
                size="sm"
                onClick={onApply}
                disabled={couponInput.trim().length < 3}
                isPending={isValidatingCoupon}
              >
                Apply
              </LoadingButton>
            </div>
          )}
          {helperText && couponInput.trim().length >= 3 && !appliedCoupon && (
            <p className="text-xs text-muted-foreground">{helperText}</p>
          )}
          {!helperText &&
            couponInput.trim().length >= 3 &&
            !appliedCoupon &&
            couponResult &&
            !isValidatingCoupon &&
            !couponResult.valid && (
              <p className="text-xs text-destructive">{couponResult.message}</p>
            )}
        </div>
        <CouponIllustration className="hidden sm:block h-16 w-16 shrink-0" />
      </div>
    </div>
  );
}
