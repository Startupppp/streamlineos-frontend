"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NotFoundIllustration } from "@/components/illustrations";
import { LayoutDashboard, FolderKanban } from "lucide-react";
import { useMotionVariants } from "@/lib/motion-variants";
import { useParams } from "next/navigation";

export default function BuildProjectNotFound() {
  const { staggerContainer, fadeUp } = useMotionVariants();
  const params = useParams();
  const projectId = typeof params?.projectId === "string" ? params.projectId : null;
  const backHref =
    projectId && Number.isFinite(Number(projectId)) && Number(projectId) > 0
      ? `/build/${projectId}`
      : "/build/projects";

  return (
    <motion.div
      className="flex flex-1 flex-col items-center justify-center py-16 px-6 text-center min-h-[60dvh]"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} className="mb-6">
        <NotFoundIllustration className="mx-auto h-44 w-44 sm:h-52 sm:w-52" />
      </motion.div>
      <motion.div variants={fadeUp} className="max-w-md space-y-3">
        <h1 className="text-4xl font-bold text-foreground tracking-tight">
          Page Not Found
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          This Build page does not exist or is no longer available.
        </p>
      </motion.div>
      <motion.div
        variants={fadeUp}
        className="mt-10 flex flex-col sm:flex-row items-center gap-4"
      >
        <Button asChild size="lg" className="min-w-[200px] shadow-lg shadow-primary/20">
          <Link href={backHref}>
            <FolderKanban className="mr-2 h-4 w-4" />
            Back to project
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="min-w-[200px]">
          <Link href="/dashboard">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}
