"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useSprintBurndown } from "../../lib/hooks/trpc-hooks";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface BurndownChartProps {
  sprintId: number;
}

export function BurndownChart({ sprintId }: BurndownChartProps) {
  const { data, isLoading } = useSprintBurndown(sprintId);

  if (isLoading) {
    return (
      <Card>
        <CardContent>Loading burndown chart...</CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent>No data available</CardContent>
      </Card>
    );
  }

  const { idealBurndown, actualBurndown, totalPoints } = data;
  const maxPoints = Math.max(
    ...idealBurndown.map((d) => d.points),
    totalPoints
  );
  const chartHeight = 300;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Burndown Chart</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height: `${chartHeight}px` }}>
          <svg width="100%" height={chartHeight} className="overflow-visible">
            <defs>
              <linearGradient
                id="idealGradient"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient
                id="actualGradient"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            {idealBurndown.map((point, index) => {
              const x = (index / (idealBurndown.length - 1)) * 100;
              const y = ((maxPoints - point.points) / maxPoints) * chartHeight;
              const nextPoint = idealBurndown[index + 1];
              const nextX = nextPoint
                ? ((index + 1) / (idealBurndown.length - 1)) * 100
                : x;
              const nextY = nextPoint
                ? ((maxPoints - nextPoint.points) / maxPoints) * chartHeight
                : y;

              return (
                <motion.line
                  key={`ideal-${index}`}
                  x1={`${x}%`}
                  y1={y}
                  x2={`${nextX}%`}
                  y2={nextY}
                  stroke="#3B82F6"
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.01 }}
                />
              );
            })}

            {actualBurndown.length > 0 && (
              <>
                {actualBurndown.map((point, index) => {
                  const dateIndex = idealBurndown.findIndex(
                    (d) =>
                      format(d.date, "yyyy-MM-dd") ===
                      format(new Date(point.date), "yyyy-MM-dd")
                  );
                  if (dateIndex === -1) return null;

                  const x = (dateIndex / (idealBurndown.length - 1)) * 100;
                  const y =
                    ((maxPoints - Number(point.points)) / maxPoints) *
                    chartHeight;
                  const nextPoint = actualBurndown[index + 1];
                  const nextDateIndex = nextPoint
                    ? idealBurndown.findIndex(
                        (d) =>
                          format(d.date, "yyyy-MM-dd") ===
                          format(new Date(nextPoint.date), "yyyy-MM-dd")
                      )
                    : -1;

                  if (nextDateIndex === -1) return null;

                  const nextX =
                    (nextDateIndex / (idealBurndown.length - 1)) * 100;
                  const nextY =
                    ((maxPoints - Number(nextPoint.points)) / maxPoints) *
                    chartHeight;

                  return (
                    <motion.line
                      key={`actual-${index}`}
                      x1={`${x}%`}
                      y1={y}
                      x2={`${nextX}%`}
                      y2={nextY}
                      stroke="#10B981"
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.01 }}
                    />
                  );
                })}

                {actualBurndown.map((point, index) => {
                  const dateIndex = idealBurndown.findIndex(
                    (d) =>
                      format(d.date, "yyyy-MM-dd") ===
                      format(new Date(point.date), "yyyy-MM-dd")
                  );
                  if (dateIndex === -1) return null;

                  const x = (dateIndex / (idealBurndown.length - 1)) * 100;
                  const y =
                    ((maxPoints - Number(point.points)) / maxPoints) *
                    chartHeight;

                  return (
                    <motion.circle
                      key={`point-${index}`}
                      cx={`${x}%`}
                      cy={y}
                      r="4"
                      fill="#10B981"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    />
                  );
                })}
              </>
            )}
          </svg>

          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground">
            {idealBurndown.map((point, index) => {
              if (index % Math.ceil(idealBurndown.length / 5) !== 0)
                return null;
              return <span key={index}>{format(point.date, "MMM dd")}</span>;
            })}
          </div>
        </div>

        <div className="mt-4 flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span className="text-sm">Ideal Burndown</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span className="text-sm">Actual Burndown</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
