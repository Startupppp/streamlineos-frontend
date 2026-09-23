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
  ChevronUpIcon,
  CircleCheckIcon,
  ClipboardIcon,
  CopyIcon,
  EllipsisIcon,
  GlobeIcon,
  InfoIcon,
  LayoutGridIcon,
  LayoutListIcon,
  LoaderCircleIcon,
  LockIcon,
  MessageCircleIcon,
  MoveRightIcon,
  PlusIcon,
  SearchIcon,
  ShareIcon,
  ShieldXIcon,
  StarIcon,
  ThumbsUpIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UploadIcon,
  UserPenIcon,
  UsersIcon,
  XIcon,
  EyeIcon,
  DownloadIcon,
} from "@animateicons/react/lucide";
import {
  Building2,
  Clock,
  FileDown,
  History,
  Image as ImageIcon,
  Link2,
  PanelRightClose,
  PanelRightOpen,
  PenLine,
  RotateCcw,
  Save,
  Smile,
  Unlock,
  type LucideIcon,
} from "lucide-react";

type KbIconProps = {
  className?: string;
  size?: number;
};

export type KbIconComponent = AnimatedNavIconComponent;

const TAILWIND_UNIT_PX = 4;
const TAILWIND_SIZE_TOKEN_RE = /^(?:h|w|size)-(\d+(?:\.\d+)?)$/;
const TAILWIND_ARBITRARY_PX_RE = /^(?:h|w|size)-\[(\d+(?:\.\d+)?)px\]$/;
const TAILWIND_ARBITRARY_REM_RE = /^(?:h|w|size)-\[(\d+(?:\.\d+)?)rem\]$/;

function classNameToIconSize(className?: string): number | undefined {
  if (!className) return undefined;

  const tokens = className.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const tokenMatch = token.match(TAILWIND_SIZE_TOKEN_RE);
    if (tokenMatch) {
      return Number(tokenMatch[1]) * TAILWIND_UNIT_PX;
    }

    const pxMatch = token.match(TAILWIND_ARBITRARY_PX_RE);
    if (pxMatch) {
      return Number(pxMatch[1]);
    }

    const remMatch = token.match(TAILWIND_ARBITRARY_REM_RE);
    if (remMatch) {
      return Number(remMatch[1]) * 16;
    }
  }

  return undefined;
}

type AnimateIconSource = React.ForwardRefExoticComponent<
  KbIconProps & React.RefAttributes<IconHandle>
>;

function createAnimatedIcon(Icon: AnimateIconSource): KbIconComponent {
  return forwardRef<IconHandle, KbIconProps>(function KbAnimatedIcon(
    { className, size },
    ref,
  ) {
    return (
      <Icon
        ref={ref}
        className={className}
        size={size ?? classNameToIconSize(className)}
      />
    );
  });
}

function createLucideIcon(Icon: LucideIcon): KbIconComponent {
  return forwardRef<IconHandle, KbIconProps>(function KbLucideIcon(
    { className, size },
    _,
  ) {
    return <Icon className={className} size={size ?? classNameToIconSize(className)} />;
  });
}

export const KbPlusIcon = createAnimatedIcon(PlusIcon);
export const KbStarIcon = createAnimatedIcon(StarIcon);
export const KbSearchIcon = createAnimatedIcon(SearchIcon);
export const KbTrash2Icon = createAnimatedIcon(Trash2Icon);
export const KbLockIcon = createAnimatedIcon(LockIcon);
export const KbUsersIcon = createAnimatedIcon(UsersIcon);
export const KbLayoutGridIcon = createAnimatedIcon(LayoutGridIcon);
export const KbBarChart2Icon = createAnimatedIcon(ChartBarIcon);
export const KbUploadIcon = createAnimatedIcon(UploadIcon);
export const KbClipboardIcon = createAnimatedIcon(ClipboardIcon);
export const KbChevronDownIcon = createAnimatedIcon(ChevronDownIcon);
export const KbChevronRightIcon = createAnimatedIcon(ChevronRightIcon);
export const KbMoreHorizontalIcon = createAnimatedIcon(EllipsisIcon);
export const KbLoader2Icon = createAnimatedIcon(LoaderCircleIcon);
export const KbCheckIcon = createAnimatedIcon(CheckIcon);
export const KbCopyIcon = createAnimatedIcon(CopyIcon);
export const KbGlobeIcon = createAnimatedIcon(GlobeIcon);
export const KbShare2Icon = createAnimatedIcon(ShareIcon);
export const KbInfoIcon = createAnimatedIcon(InfoIcon);
export const KbDownloadIcon = createAnimatedIcon(DownloadIcon);
export const KbTriangleAlertIcon = createAnimatedIcon(TriangleAlertIcon);
export const KbAlertCircleIcon = createAnimatedIcon(TriangleAlertIcon);
export const KbEyeIcon = createAnimatedIcon(EyeIcon);
export const KbThumbsUpIcon = createAnimatedIcon(ThumbsUpIcon);
export const KbMoveRightIcon = createAnimatedIcon(MoveRightIcon);
export const KbArrowRightIcon = createAnimatedIcon(MoveRightIcon);
export const KbXIcon = createAnimatedIcon(XIcon);
export const KbCheckCircleIcon = createAnimatedIcon(CircleCheckIcon);
export const KbXCircleIcon = createAnimatedIcon(ShieldXIcon);
export const KbBookOpenTextIcon = createAnimatedIcon(BookOpenTextIcon);
export const KbFileTextIcon = createAnimatedIcon(BookOpenTextIcon);
export const KbLayoutTemplateIcon = createAnimatedIcon(LayoutListIcon);
export const KbMessageCircleIcon = createAnimatedIcon(MessageCircleIcon);
export const KbMessageSquareIcon = createAnimatedIcon(MessageCircleIcon);
export const KbClipboardCheckIcon = createAnimatedIcon(BookOpenCheckIcon);
export const KbPencilIcon = createAnimatedIcon(UserPenIcon);
export const KbEdit2Icon = createAnimatedIcon(UserPenIcon);

export const KbClockIcon = createLucideIcon(Clock);
export const KbRotateCcwIcon = createLucideIcon(RotateCcw);
export const KbHistoryIcon = createLucideIcon(History);
export const KbPanelRightOpenIcon = createLucideIcon(PanelRightOpen);
export const KbPanelRightCloseIcon = createLucideIcon(PanelRightClose);
export const KbImageIcon = createLucideIcon(ImageIcon);
export const KbSmileIcon = createLucideIcon(Smile);
export const KbBuilding2Icon = createLucideIcon(Building2);
export const KbLink2Icon = createLucideIcon(Link2);
export const KbUnlockIcon = createLucideIcon(Unlock);
export const KbFileDownIcon = createLucideIcon(FileDown);
export const KbSaveIcon = createLucideIcon(Save);
export const KbPenLineIcon = createLucideIcon(PenLine);
export const KbChevronUpIcon = createAnimatedIcon(ChevronUpIcon);
