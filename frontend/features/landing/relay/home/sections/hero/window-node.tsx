import { InviewSeen } from "@/features/landing/relay/components/ui/inview-seen";
import { SPRING } from "@/features/landing/relay/lib/motion";

export interface WindowNodeProps {
  title: string;
  source: string;
  className?: string;
  glow?: boolean;
  delay?: number;
}

export const WindowNode = ({
  title,
  source,
  className = "",
  glow = false,
  delay = 0,
}: WindowNodeProps) => (
  <InviewSeen
    mode="once"
    from={{ opacity: 0, y: 8 }}
    to={{ opacity: 1, y: 0 }}
    config={SPRING}
    delayIn={delay}
    className={`absolute flex flex-col items-start gap-1 overflow-clip rounded-hero-node border border-hero-node-border bg-hero-node backdrop-blur-hero-card px-4.75 py-3.25 whitespace-nowrap w1024:items-center w1024:gap-0 w1024:px-3.75 w1024:py-2.75 w768:py-2.25 ${glow ? "shadow-hero-node-glow" : "shadow-float"} ${className}`}
  >
    <p className="text-body leading-body font-medium text-foreground w1024:text-relay-label w1024:leading-label">
      {title}
    </p>
    <p className="font-mono text-relay-label leading-label text-foreground-dim">
      {source}
    </p>
  </InviewSeen>
);
