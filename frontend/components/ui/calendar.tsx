"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type CaptionProps, useNavigation, useDayPicker } from "react-day-picker"
import { setMonth, setYear } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  compact?: boolean
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function CalendarCaption({ displayMonth, compact = false }: CaptionProps & { compact?: boolean }) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation()
  const { fromYear, toYear, fromDate, toDate } = useDayPicker()

  const month = displayMonth.getMonth()
  const year = displayMonth.getFullYear()

  const startYear = fromYear ?? fromDate?.getFullYear() ?? 1950
  const endYear = toYear ?? toDate?.getFullYear() ?? new Date().getFullYear() + 5
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i)

  return (
    <div className={cn("flex items-center justify-between w-full", compact ? "px-0" : "px-1")}>
      <button
        type="button"
        onClick={() => previousMonth && goToMonth(previousMonth)}
        disabled={!previousMonth}
        className={cn(
          buttonVariants({ variant: "outline" }),
          compact ? "h-6 w-6" : "h-7 w-7",
          "bg-transparent p-0 opacity-50 hover:opacity-100 disabled:opacity-20 shrink-0"
        )}
        aria-label="Previous month"
      >
        <ChevronLeft className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>

      <div className="flex items-center gap-0.5 min-w-0">
        <Select
          value={String(month)}
          onValueChange={(v) => goToMonth(setMonth(displayMonth, parseInt(v)))}
        >
          <SelectTrigger
            className={cn(
              "border-0 bg-transparent shadow-none focus:ring-0 font-medium",
              compact ? "h-6 w-[5.5rem] px-1 text-dense" : "h-8 w-[112px] text-xs",
            )}
          >
            <SelectValue>{MONTH_NAMES[month]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, i) => (
              <SelectItem key={name} value={String(i)} className="text-xs">
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(year)}
          onValueChange={(v) => goToMonth(setYear(displayMonth, parseInt(v)))}
        >
          <SelectTrigger
            className={cn(
              "shrink-0 gap-1 border-0 bg-transparent shadow-none focus:ring-0 font-medium *:data-[slot=select-value]:line-clamp-none",
              compact ? "h-6 w-[3.25rem] px-1 text-dense" : "h-8 w-[4.75rem] px-2 text-xs",
            )}
          >
            <SelectValue>{year}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)} className="text-xs">
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <button
        type="button"
        onClick={() => nextMonth && goToMonth(nextMonth)}
        disabled={!nextMonth}
        className={cn(
          buttonVariants({ variant: "outline" }),
          compact ? "h-6 w-6" : "h-7 w-7",
          "bg-transparent p-0 opacity-50 hover:opacity-100 disabled:opacity-20 shrink-0"
        )}
        aria-label="Next month"
      >
        <ChevronRight className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
    </div>
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  compact = false,
  ...props
}: CalendarProps) {
  const daySize = compact ? "h-8 w-8" : "h-9 w-9"

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(compact ? "p-1.5" : "p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: compact ? "space-y-2 w-full" : "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "hidden",
        nav: "hidden",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          compact ? "h-6 w-6" : "h-7 w-7",
          "bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex w-full",
        head_cell: cn(
          "text-muted-foreground rounded-md font-normal flex-1 text-center",
          compact ? "text-micro" : "w-9 text-label",
        ),
        row: cn("flex w-full", compact ? "mt-1" : "mt-2"),
        cell: cn(
          "text-center text-sm p-0 relative flex-1 [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          compact ? "h-8" : "h-9 w-9",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          daySize,
          "p-0 font-normal aria-selected:opacity-100",
          compact && "mx-auto text-xs",
        ),
        day_range_end: "day-range-end",
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Caption: (captionProps) => (
          <CalendarCaption {...captionProps} compact={compact} />
        ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
