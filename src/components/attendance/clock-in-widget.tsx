"use client";

import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useState, useEffect } from "react";

export function ClockInWidget() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setNow(new Date()), 1000); // 1 sec for accurate time if we want seconds later
    return () => clearInterval(timer);
  }, []);

  if (!mounted) return null; // Avoid hydration mismatch

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="text-white font-bold text-sm tracking-wide">
        {format(now, "EEE dd, MMM yyyy").toUpperCase()}
      </div>
      <Button 
        variant="destructive" 
        className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 h-auto text-xs tracking-wider rounded-sm shadow-lg shadow-red-900/20"
      >
        WEB CLOCK-IN
      </Button>
    </div>
  );
}
