"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { PersonDrawer } from "@/components/shared/person-drawer";
import { useCan } from "@/hooks/api/access";
import { hrmsListStagger, hrmsRowEnter, hrmsRowEnterReduced, hrmsTransition, hrmsVariants } from "@/lib/hrms/motion";
import type { ManagerHome, ManagerHomeReport } from "@/hooks/api/hr/manager-home-schema";
import { TeamRosterRow, type RosterRowLeave } from "./team-roster-row";

interface TeamRosterProps {
  reports: ManagerHomeReport[];
  upcomingLeave: ManagerHome["upcomingLeave"];
}

function RosterFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-dense text-muted-foreground">{label}</span>
      <span className="text-dense text-foreground">{value}</span>
    </div>
  );
}

export function TeamRoster({ reports, upcomingLeave }: TeamRosterProps) {
  const reduced = useReducedMotion();
  const canSeePay = useCan("payroll:salaries:view");
  const [selected, setSelected] = useState<ManagerHomeReport | null>(null);
  const [open, setOpen] = useState(false);

  const nextLeaveByUser = useMemo(() => {
    const map = new Map<string, RosterRowLeave>();
    for (const leave of upcomingLeave) {
      if (!map.has(leave.userId)) map.set(leave.userId, { startDate: leave.startDate, endDate: leave.endDate });
    }
    return map;
  }, [upcomingLeave]);

  const selectedNextLeave = selected ? nextLeaveByUser.get(selected.userId) ?? null : null;

  const handleOpen = useCallback((report: ManagerHomeReport) => {
    setSelected(report);
    setOpen(true);
  }, []);

  return (
    <>
      <ul className="divide-y divide-border">
        {reports.map((report, index) => (
          <motion.li
            key={report.userId}
            initial="hidden"
            animate="show"
            variants={hrmsVariants(reduced, hrmsRowEnter, hrmsRowEnterReduced)}
            transition={hrmsTransition(reduced, hrmsListStagger(index))}
          >
            <TeamRosterRow
              report={report}
              nextLeave={nextLeaveByUser.get(report.userId) ?? null}
              onOpen={handleOpen}
            />
          </motion.li>
        ))}
      </ul>

      <PersonDrawer
        open={open}
        onOpenChange={setOpen}
        canSeePay={canSeePay}
        person={
          selected
            ? {
                userId: selected.userId,
                name: selected.name,
                email: selected.email,
                designation: selected.designation,
              }
            : null
        }
        sections={
          selected
            ? {
                overview: (
                  <div className="divide-y divide-border">
                    <RosterFact label="Email" value={selected.email ?? "—"} />
                    <RosterFact label="Designation" value={selected.designation ?? "—"} />
                    <RosterFact label="Today" value={selected.onLeaveToday ? "On leave" : "Not measured"} />
                  </div>
                ),
                employment: (
                  <div className="divide-y divide-border">
                    <RosterFact label="Lifecycle" value={selected.lifecycleStatus} />
                    <RosterFact
                      label="Joined"
                      value={selected.joiningDate ? format(parseISO(selected.joiningDate), "MMM d, yyyy") : "—"}
                    />
                    <RosterFact
                      label="Probation ends"
                      value={selected.probationEndsOn ? format(parseISO(selected.probationEndsOn), "MMM d, yyyy") : "—"}
                    />
                  </div>
                ),
                time: (
                  <div className="divide-y divide-border">
                    <RosterFact label="Unsettled timesheets" value={String(selected.unsettledTimesheets)} />
                    <RosterFact
                      label="Next approved leave"
                      value={
                        selectedNextLeave
                          ? format(parseISO(selectedNextLeave.startDate), "MMM d")
                          : "None in the next two weeks"
                      }
                    />
                  </div>
                ),
              }
            : {}
        }
      />
    </>
  );
}
