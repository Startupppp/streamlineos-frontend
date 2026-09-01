"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  className?: string;
  gradient?: boolean;
};

export function AnimatedLogo({ size = 36, className }: Props) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      style={{ width: size, height: size }}
      className={cn("shrink-0 overflow-hidden", className)}
      whileHover={reduce ? undefined : { scale: 1.05 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Image
        src="/logo.svg"
        alt="StreamlineOS"
        width={size}
        height={size}
        className="h-full w-full object-cover"
        priority={size >= 44}
      />
    </motion.div>
  );
}
