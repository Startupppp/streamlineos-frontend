"use client";

import { motion } from "framer-motion";

interface BarDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface MiniBarChartProps {
  data: BarDataPoint[];
  height?: number;
  defaultColor?: string;
  formatValue?: (v: number) => string;
}

export function MiniBarChart({
  data,
  height = 200,
  defaultColor = "#3B82F6",
  formatValue = (v) => v.toLocaleString(),
}: MiniBarChartProps) {
  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.value));
  const paddingBottom = 40;
  const paddingTop = 20;
  const barAreaHeight = height - paddingBottom - paddingTop;

  return (
    <div className="w-full" style={{ height }}>
      <div className="flex items-end justify-around gap-2 h-full" style={{ paddingBottom, paddingTop }}>
        {data.map((item, i) => {
          const barHeight = (item.value / maxVal) * barAreaHeight;
          const color = item.color || defaultColor;
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-[10px] text-muted-foreground font-medium">
                {formatValue(item.value)}
              </span>
              <motion.div
                className="w-full max-w-[40px] rounded-t-md"
                style={{ backgroundColor: color }}
                initial={{ height: 0 }}
                animate={{ height: barHeight }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
              />
              <span className="text-[10px] text-muted-foreground text-center leading-tight mt-1 truncate w-full max-w-[60px]">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
