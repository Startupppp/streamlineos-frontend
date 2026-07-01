"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/api/access";

const CourseCatalog = dynamic(
  () => import("@/features/hr/courses/course-catalog").then((m) => m.CourseCatalog),
  { ssr: false },
);

const MyLearning = dynamic(
  () => import("@/features/hr/courses/my-learning").then((m) => m.MyLearning),
  { ssr: false },
);

const CreateCourseSheet = dynamic(
  () => import("@/features/hr/courses/create-course-sheet").then((m) => m.CreateCourseSheet),
  { ssr: false },
);

export default function CoursesPage() {
  const canManage = useCan("hr:learning:manage");
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleOpenSheet() {
    setSheetOpen(true);
  }

  return (
    <PageWrapper
      title="Course Library"
      subtitle="Explore and enroll in courses"
      actions={
        canManage ? (
          <Button
            onClick={handleOpenSheet}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Course
          </Button>
        ) : undefined
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <Tabs defaultValue="catalog">
          <TabsList className="mb-4">
            <TabsTrigger value="catalog">Course Catalog</TabsTrigger>
            <TabsTrigger value="my-learning">My Learning</TabsTrigger>
          </TabsList>
          <TabsContent value="catalog">
            <CourseCatalog canManage={canManage} />
          </TabsContent>
          <TabsContent value="my-learning">
            <MyLearning />
          </TabsContent>
        </Tabs>
      </motion.div>
      {canManage && (
        <CreateCourseSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      )}
    </PageWrapper>
  );
}
