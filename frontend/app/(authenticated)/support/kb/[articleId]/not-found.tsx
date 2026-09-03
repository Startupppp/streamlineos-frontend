"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NotFoundIllustration } from "@/components/illustrations";
import { ArrowLeft } from "lucide-react";
import {
  KbBookOpenTextIcon,
  KbSearchIcon,
} from "@/features/wiki/lib/kb-icons";
import { useMotionVariants } from "@/lib/motion-variants";

export default function KbArticleNotFound() {
  const { staggerContainer, fadeUp } = useMotionVariants();
  return (
    <motion.div
      className="flex flex-1 flex-col items-center justify-center py-16 px-6 text-center min-h-[60dvh]"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} className="mb-6">
        <NotFoundIllustration className="mx-auto h-40 w-40 sm:h-48 sm:w-48" />
      </motion.div>

      <motion.div variants={fadeUp} className="max-w-md space-y-2">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Article not found
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          This article may have been removed, moved, or the link is no longer
          valid. Browse the knowledge base or search for what you need.
        </p>
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="mt-8 flex flex-col sm:flex-row items-center gap-3"
      >
        <Button asChild size="default" className="min-w-[180px]">
          <Link href="/support/kb">
            <KbBookOpenTextIcon className="mr-2 h-4 w-4" />
            Browse Knowledge Base
          </Link>
        </Button>
        <Button asChild variant="outline" size="default" className="min-w-[180px]">
          <Link href="/support/kb">
            <KbSearchIcon className="mr-2 h-4 w-4" />
            Search Articles
          </Link>
        </Button>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
        >
          <Link href="/support/kb">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Knowledge Base
          </Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}
