"use client";

import { forwardRef } from "react";
import type { IconHandle } from "@animateicons/react";
import type { AnimatedNavIconComponent } from "@/components/layout/sidebar/sidebar-animated-nav";
import {
  BookOpenCheckIcon,
  BookOpenTextIcon,
  ChartBarIcon,
  CheckIcon,
  CircleCheckIcon,
} from "@animateicons/react/lucide";
import {
  Banknote,
  Clock,
  Coins,
  Layers,
  Percent,
  PiggyBank,
  Receipt,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
  Wallet,
} from "lucide-react";

type FinanceIconProps = {
  className?: string;
  size?: number;
};

type AnimateIconSource = React.ForwardRefExoticComponent<
  FinanceIconProps & React.RefAttributes<IconHandle>
>;

function createAnimatedIcon(
  Icon: AnimateIconSource,
): AnimatedNavIconComponent {
  return forwardRef<IconHandle, FinanceIconProps>(
    function FinanceAnimatedIcon({ className, size }, ref) {
      return <Icon ref={ref} className={className} size={size} />;
    },
  );
}

function createLucideIcon(Icon: LucideIcon): AnimatedNavIconComponent {
  return forwardRef<IconHandle, FinanceIconProps>(
    function FinanceLucideIcon({ className, size }, _) {
      return <Icon className={className} size={size} />;
    },
  );
}

export const FiBarChart3Icon = createAnimatedIcon(ChartBarIcon);
export const FiCheckIcon = createAnimatedIcon(CheckIcon);
export const FiCircleCheckIcon = createAnimatedIcon(CircleCheckIcon);
export const FiFileTextIcon = createAnimatedIcon(BookOpenTextIcon);
export const FiBookOpenIcon = createAnimatedIcon(BookOpenCheckIcon);

export const FiReceiptIcon = createLucideIcon(Receipt);
export const FiWalletIcon = createLucideIcon(Wallet);
export const FiCoinsIcon = createLucideIcon(Coins);
export const FiRefreshCcwIcon = createLucideIcon(RefreshCcw);
export const FiClockIcon = createLucideIcon(Clock);
export const FiTrendingUpIcon = createLucideIcon(TrendingUp);
export const FiTrendingDownIcon = createLucideIcon(TrendingDown);
export const FiPiggyBankIcon = createLucideIcon(PiggyBank);
export const FiLayersIcon = createLucideIcon(Layers);
export const FiPercentIcon = createLucideIcon(Percent);
export const FiBanknoteIcon = createLucideIcon(Banknote);
