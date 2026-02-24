"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import Link from "next/link";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  href?: string;
  className?: string;
  index?: number;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  href,
  className,
  index = 0,
}: StatCardProps) {
  const content = (
    <Card
      className={cn(
        "relative overflow-hidden border-border transition-all duration-200",
        href && "hover:shadow-md hover:border-gold/40 cursor-pointer",
        className
      )}
      style={{
        animation: `fade-up 0.4s ease-out ${index * 0.1}s both`,
      }}
    >
      {/* Gold accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] gold-gradient" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div className="h-8 w-8 rounded-lg bg-gold/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-gold" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {trend && (
          <p
            className={cn(
              "text-xs mt-1",
              trend.isPositive ? "text-emerald-600" : "text-red-600"
            )}
          >
            {trend.isPositive ? "+" : "-"}
            {Math.abs(trend.value)}% from last period
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
