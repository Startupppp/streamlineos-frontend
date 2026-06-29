"use client";

import { useState } from "react";
import { UserDetailSheet } from "./user-detail-sheet";

interface UserDetailPageProps {
  userId: string;
}

export function UserDetailPage({ userId }: UserDetailPageProps) {
  const [open, setOpen] = useState(true);
  return (
    <div className="p-6">
      <UserDetailSheet userId={userId} open={open} onOpenChange={setOpen} />
    </div>
  );
}
