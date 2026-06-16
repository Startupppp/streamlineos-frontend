"use client";

import { motion } from "framer-motion";
import Image from "next/image";

type Props = {
  size?: number;
  className?: string;
};

export function AnimatedLogo({ size = 36, className }: Props) {
  return (
    <motion.div
      style={{ width: size, height: size }}
      className={className}
      whileHover={{ scale: 1.05 }}
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
