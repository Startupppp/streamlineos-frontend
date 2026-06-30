"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { GeofenceList } from "@/features/hr/geofencing/geofence-list";
import { GeofenceFormSheet } from "@/features/hr/geofencing/geofence-form-sheet";

export default function GeofencingPage() {
  const canManage = useCan("hr:attendance:manage");
  const [open, setOpen] = useState(false);

  function handleOpen() {
    setOpen(true);
  }

  return (
    <PageWrapper
      title="Geofencing"
      subtitle="Define office location boundaries for attendance validation"
      actions={
        canManage ? (
          <Button
            onClick={handleOpen}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        ) : undefined
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <GeofenceList canManage={canManage} />
      </motion.div>
      <GeofenceFormSheet open={open} onOpenChange={setOpen} />
    </PageWrapper>
  );
}
