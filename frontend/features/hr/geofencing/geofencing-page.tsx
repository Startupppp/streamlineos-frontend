"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { GeofenceList } from "./geofence-list";
import { GeofenceFormSheet } from "./geofence-form-sheet";
import type { Geofence } from "@/hooks/api/hr/geofencing";

export function GeofencingPage() {
  const canManage = useCan("hr:attendance:manage");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Geofence | null>(null);

  function handleOpen() {
    setEditing(null);
    setOpen(true);
  }

  function handleEdit(fence: Geofence) {
    setEditing(fence);
    setOpen(true);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setEditing(null);
  }

  return (
    <PageWrapper
      title="Geofencing"
      subtitle="Define office location boundaries for attendance validation"
      actions={
        canManage ? (
          <Button onClick={handleOpen}>
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
        <GeofenceList canManage={canManage} onEdit={handleEdit} />
      </motion.div>
      <GeofenceFormSheet open={open} onOpenChange={handleOpenChange} fence={editing} />
    </PageWrapper>
  );
}
