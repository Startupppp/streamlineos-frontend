"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FeedbackError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/40 flex items-center justify-center p-6">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-10 text-center space-y-4 max-w-md w-full">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-lg font-semibold text-slate-800">Something went wrong</h2>
        <p className="text-sm text-slate-500">{error.message || "Failed to load feedback"}</p>
        <Button
          onClick={reset}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}
