import { AnimatedLogo } from "@/components/brand/animated-logo";
import { BRAND_NAME } from "@/lib/branding";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  size?: number;
  className?: string;
};

export function BrandMark({ size = 28, className }: BrandMarkProps) {
  return (
    <div
      className={cn(
        "mb-3 flex items-center gap-2.5 self-start lg:mb-4",
        className,
      )}
      aria-label={BRAND_NAME}
    >
      <AnimatedLogo size={size} className="rounded-xl" />
      <span className="font-display text-sm font-bold tracking-tight text-foreground">
        {BRAND_NAME}
      </span>
    </div>
  );
}
