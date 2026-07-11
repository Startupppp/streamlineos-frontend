"use client";

import { forwardRef } from "react";
import type { IconHandle } from "@animateicons/react";
import type { AnimatedNavIconComponent } from "@/components/layout/sidebar/sidebar-animated-nav";
import {
  BookOpenCheckIcon,
  BookOpenTextIcon,
  ChartBarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  CopyIcon,
  DownloadIcon,
  EllipsisIcon,
  ExternalLinkIcon,
  EyeIcon,
  GlobeIcon,
  InfoIcon,
  LayoutListIcon,
  LoaderCircleIcon,
  LockIcon,
  MessageCircleIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  ShareIcon,
  ShieldCheckIcon,
  StarIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UploadIcon,
  UsersIcon,
  XIcon,
} from "@animateicons/react/lucide";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  Banknote,
  Bell,
  BookOpen,
  Calculator,
  ClipboardList,
  Clock,
  Coins,
  FileStack,
  HandCoins,
  Inbox,
  Landmark,
  Layers,
  Package,
  Percent,
  PiggyBank,
  PlayCircle,
  Receipt,
  RefreshCcw,
  Scale,
  ShoppingCart,
  SlidersHorizontal,
  Tag,
  TrendingDown,
  TrendingUp,
  Truck,
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
    function FinanceLucideIcon({ className, size }, _ref) {
      return <Icon className={className} size={size} />;
    },
  );
}

export const FiPlusIcon = createAnimatedIcon(PlusIcon);
export const FiSearchIcon = createAnimatedIcon(SearchIcon);
export const FiTrash2Icon = createAnimatedIcon(Trash2Icon);
export const FiLockIcon = createAnimatedIcon(LockIcon);
export const FiUsersIcon = createAnimatedIcon(UsersIcon);
export const FiBarChart3Icon = createAnimatedIcon(ChartBarIcon);
export const FiSettingsIcon = createAnimatedIcon(SettingsIcon);
export const FiUploadIcon = createAnimatedIcon(UploadIcon);
export const FiDownloadIcon = createAnimatedIcon(DownloadIcon);
export const FiChevronDownIcon = createAnimatedIcon(ChevronDownIcon);
export const FiChevronRightIcon = createAnimatedIcon(ChevronRightIcon);
export const FiEllipsisIcon = createAnimatedIcon(EllipsisIcon);
export const FiLoaderCircleIcon = createAnimatedIcon(LoaderCircleIcon);
export const FiCheckIcon = createAnimatedIcon(CheckIcon);
export const FiCopyIcon = createAnimatedIcon(CopyIcon);
export const FiGlobeIcon = createAnimatedIcon(GlobeIcon);
export const FiShareIcon = createAnimatedIcon(ShareIcon);
export const FiExternalLinkIcon = createAnimatedIcon(ExternalLinkIcon);
export const FiShieldCheckIcon = createAnimatedIcon(ShieldCheckIcon);
export const FiInfoIcon = createAnimatedIcon(InfoIcon);
export const FiTriangleAlertIcon = createAnimatedIcon(TriangleAlertIcon);
export const FiEyeIcon = createAnimatedIcon(EyeIcon);
export const FiStarIcon = createAnimatedIcon(StarIcon);
export const FiXIcon = createAnimatedIcon(XIcon);
export const FiCircleCheckIcon = createAnimatedIcon(CircleCheckIcon);
export const FiFileTextIcon = createAnimatedIcon(BookOpenTextIcon);
export const FiBookOpenIcon = createAnimatedIcon(BookOpenCheckIcon);
export const FiLayoutListIcon = createAnimatedIcon(LayoutListIcon);
export const FiMessageCircleIcon = createAnimatedIcon(MessageCircleIcon);

export const FiCalculatorIcon = createLucideIcon(Calculator);
export const FiReceiptIcon = createLucideIcon(Receipt);
export const FiLandmarkIcon = createLucideIcon(Landmark);
export const FiWalletIcon = createLucideIcon(Wallet);
export const FiCoinsIcon = createLucideIcon(Coins);
export const FiRefreshCcwIcon = createLucideIcon(RefreshCcw);
export const FiClockIcon = createLucideIcon(Clock);
export const FiBellIcon = createLucideIcon(Bell);
export const FiTruckIcon = createLucideIcon(Truck);
export const FiShoppingCartIcon = createLucideIcon(ShoppingCart);
export const FiArrowDownToLineIcon = createLucideIcon(ArrowDownToLine);
export const FiArrowLeftRightIcon = createLucideIcon(ArrowLeftRight);
export const FiScaleIcon = createLucideIcon(Scale);
export const FiInboxIcon = createLucideIcon(Inbox);
export const FiBookOpenLucideIcon = createLucideIcon(BookOpen);
export const FiClipboardListIcon = createLucideIcon(ClipboardList);
export const FiTagIcon = createLucideIcon(Tag);
export const FiPercentIcon = createLucideIcon(Percent);
export const FiTrendingUpIcon = createLucideIcon(TrendingUp);
export const FiTrendingDownIcon = createLucideIcon(TrendingDown);
export const FiPiggyBankIcon = createLucideIcon(PiggyBank);
export const FiLayersIcon = createLucideIcon(Layers);
export const FiPackageIcon = createLucideIcon(Package);
export const FiHandCoinsIcon = createLucideIcon(HandCoins);
export const FiFileStackIcon = createLucideIcon(FileStack);
export const FiPlayCircleIcon = createLucideIcon(PlayCircle);
export const FiBanknoteIcon = createLucideIcon(Banknote);
export const FiSlidersHorizontalIcon = createLucideIcon(SlidersHorizontal);
