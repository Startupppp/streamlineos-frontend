"use client"

import { motion } from "framer-motion"
import type { CalendarListItem } from "@/hooks/api/calendar"

interface CrmCalendarMonthViewProps {
  year: number
  month: number
  events: CalendarListItem[]
  onEventClick: (event: CalendarListItem) => void
  onDayClick: (date: Date) => void
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  meeting: { bg: "bg-blue-100 text-blue-700", text: "blue" },
  call: { bg: "bg-green-100 text-green-700", text: "green" },
  demo: { bg: "bg-indigo-100 text-indigo-700", text: "indigo" },
  deadline: { bg: "bg-red-100 text-red-700", text: "red" },
  general: { bg: "bg-amber-100 text-amber-700", text: "amber" },
  reminder: { bg: "bg-purple-100 text-purple-700", text: "purple" },
  other: { bg: "bg-amber-100 text-amber-700", text: "amber" },
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const MAX_VISIBLE_EVENTS = 3

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const days: Date[] = []
  const startDay = first.getDay()
  for (let i = startDay - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i))
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  while (days.length < 42) {
    days.push(new Date(year, month + 1, days.length - last.getDate() - startDay + 1))
  }
  return days
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

export function CrmCalendarMonthView({
  year,
  month,
  events,
  onEventClick,
  onDayClick,
}: CrmCalendarMonthViewProps) {
  const days = getMonthDays(year, month)
  const today = new Date()

  function getDayEvents(day: Date): CalendarListItem[] {
    return events.filter((event) => isSameDay(new Date(event.start), day))
  }

  function handleDayClick(day: Date) {
    onDayClick(day)
  }

  function handleEventClick(
    e: React.MouseEvent<HTMLButtonElement>,
    event: CalendarListItem
  ) {
    e.stopPropagation()
    onEventClick(event)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full"
    >
      <div className="grid grid-cols-7">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-xs font-medium text-muted-foreground text-center py-2 border-b"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 divide-x divide-y border-l border-t">
        {days.map((day, idx) => {
          const isCurrentMonth = day.getMonth() === month
          const isToday = isSameDay(day, today)
          const dayEvents = getDayEvents(day)
          const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS)
          const extraCount = dayEvents.length - MAX_VISIBLE_EVENTS

          return (
            <div
              key={idx}
              onClick={() => handleDayClick(day)}
              className={[
                "min-h-[120px] p-1.5 border-border relative cursor-pointer hover:bg-slate-50 transition-colors",
                isCurrentMonth ? "bg-white" : "bg-muted/30 text-muted-foreground",
                isToday
                  ? "outline outline-2 outline-violet-400 outline-offset-[-2px] bg-violet-50/30"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="mb-1">
                {isToday ? (
                  <span className="h-5 w-5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[11px] font-medium">
                    {day.getDate()}
                  </span>
                ) : (
                  <span className="text-xs font-medium">{day.getDate()}</span>
                )}
              </div>

              {visibleEvents.map((event) => {
                const colorKey = event.category in CATEGORY_COLORS ? event.category : "other"
                const colors = CATEGORY_COLORS[colorKey]
                return (
                  <button
                    key={event.id}
                    onClick={(e) => handleEventClick(e, event)}
                    className={[
                      "rounded-full px-2 py-0.5 text-[11px] font-medium truncate block w-full mb-0.5 cursor-pointer text-left",
                      colors.bg,
                    ].join(" ")}
                  >
                    {event.title}
                  </button>
                )
              })}

              {extraCount > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  +{extraCount} more
                </span>
              )}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
