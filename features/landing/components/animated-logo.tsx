"use client";

import { motion } from "framer-motion";

type Props = {
  size?: number;
  className?: string;
};

export function AnimatedLogo({ size = 36, className }: Props) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      initial="rest"
      whileHover="hover"
      animate="rest"
    >
      <defs>
        <linearGradient id="al-bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1E40AF" />
          <stop offset="0.55" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>

      <motion.rect
        width="64"
        height="64"
        rx="16"
        fill="url(#al-bg)"
        variants={{
          rest: { scale: 1 },
          hover: { scale: 1.05 },
        }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      />

      <motion.path
        d="M44 21c-3-3-7-4-12-4-7 0-11 3-11 7s4 6 12 8 11 5 11 9-4 7-12 7c-5 0-9-1-12-4"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
        pathLength={1}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ pathLength: { duration: 1.4, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.4 } }}
      />

      <motion.circle
        cx="47"
        cy="18"
        r="2.2"
        fill="#FFFFFF"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.4, ease: "backOut" }}
      />

      <motion.circle
        cx="47"
        cy="18"
        r="2.2"
        fill="#FFFFFF"
        animate={{ scale: [1, 2.4, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
      />
    </motion.svg>
  );
}
