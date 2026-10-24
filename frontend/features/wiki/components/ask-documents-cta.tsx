"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { SparklesIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { KB_CHAT } from "@/lib/knowledge-routes";
import { cn } from "@/lib/utils";

const SPARKLES = [
  { x: "18%", delay: 0 },
  { x: "52%", delay: 0.08 },
  { x: "78%", delay: 0.14 },
] as const;

interface AskDocumentsCtaProps {
  className?: string;
}

export function AskDocumentsCta({ className }: AskDocumentsCtaProps) {
  const reduce = useReducedMotion();
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleMouseEnter() {
    hoverHandlers.onMouseEnter();
  }

  function handleMouseLeave() {
    hoverHandlers.onMouseLeave();
  }

  return (
    <motion.div
      className={cn(
        "min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:basis-auto sm:flex-none",
        className,
      )}
      whileHover={reduce ? undefined : { scale: 1.04, y: -1 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={KB_CHAT}
        className="ask-documents-cta group relative inline-flex h-9 w-full items-center justify-center gap-1.5 overflow-hidden rounded-md px-3 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span className="relative z-10 inline-flex items-center gap-1.5">
          <SparklesIcon
            ref={iconRef}
            size={14}
            className="shrink-0 text-[color:var(--brand-deep)] transition-transform duration-200 group-hover:rotate-12 dark:text-[color:var(--brand-cyan)]"
          />
          <span className="ask-documents-cta__label">Ask documents</span>
        </span>

        {!reduce
          ? SPARKLES.map((sparkle, index) => (
              <motion.span
                key={sparkle.x}
                aria-hidden="true"
                className="pointer-events-none absolute bottom-1 z-10 size-1 rounded-full bg-[color:var(--brand-cyan)]"
                style={{ left: sparkle.x }}
                initial={{ opacity: 0, y: 0, scale: 0.4 }}
                animate={{
                  opacity: [0, 1, 0],
                  y: [0, -14, -22],
                  scale: [0.4, 1, 0.2],
                }}
                transition={{
                  duration: 1.4,
                  delay: sparkle.delay + index * 0.05,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            ))
          : null}
      </Link>
    </motion.div>
  );
}
