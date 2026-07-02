"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFeedbackResults } from "@/hooks/api/hr";

export function ResultsTab() {
  const [subjectId, setSubjectId] = useState("");
  const [searched, setSearched] = useState("");

  const { data: results, isLoading, isError } = useFeedbackResults(searched);

  function handleSearch() {
    setSearched(subjectId.trim());
  }

  const completionPct =
    results && results.totalRequests > 0
      ? Math.round((results.completedRequests / results.totalRequests) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Enter employee ID…"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} variant="outline">
          Search
        </Button>
      </div>

      {!searched && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Search className="w-12 h-12 text-slate-300" />
          <p className="text-slate-500 font-medium">Select an employee to view 360° feedback results</p>
          <p className="text-sm">Enter an employee ID above</p>
        </div>
      )}

      {searched && isLoading && (
        <div className="bg-white/90 rounded-2xl border border-slate-200/80 p-8 animate-pulse space-y-4">
          <div className="h-5 w-1/3 bg-slate-200 rounded" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}
          </div>
        </div>
      )}

      {searched && isError && (
        <div className="bg-white/90 rounded-2xl border border-red-200 p-6 text-center text-red-500">
          No results found for this employee
        </div>
      )}

      {results && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-6 space-y-5"
        >
          <h3 className="font-semibold text-slate-800">Results for {results.subjectId}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">{results.totalRequests}</p>
              <p className="text-xs text-slate-500 mt-1">Total Requests</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{results.completedRequests}</p>
              <p className="text-xs text-slate-500 mt-1">Completed</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-violet-600">
                {results.avgRating !== undefined ? results.avgRating.toFixed(1) : "—"}
              </p>
              <p className="text-xs text-slate-500 mt-1">Avg Rating</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{completionPct}%</p>
              <p className="text-xs text-slate-500 mt-1">Completion</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Completion rate</span>
              <span>{completionPct}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-700"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
