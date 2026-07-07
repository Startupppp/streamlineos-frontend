"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  className?: string;
  gradient?: boolean;
};

export function AnimatedLogo({ size = 36, className, gradient = false }: Props) {
  const reduce = useReducedMotion();

  if (gradient) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn(
          "logo-gradient-sweep shrink-0",
          reduce && "logo-gradient-static",
          className,
        )}
        role="img"
        aria-label="StreamlineOS"
      />
    );
  }

  return (
    <motion.div
      style={{ width: size, height: size }}
      className={className}
      whileHover={reduce ? undefined : { scale: 1.05 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Image
        src="/logo.svg"
        alt="StreamlineOS"
        width={size}
        height={size}
        className="rounded-lg"
      />
    </motion.div>
  );
}
