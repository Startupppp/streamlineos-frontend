"use client";

import {
  forwardRef,
  useCallback,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { resolveImageUrl, cn } from "@/lib/utils";

/**
 * The menu body is fetched on first open. Radix renders a menu's content only
 * while it is open, so the eleven link icons, the theme switcher, the five
 * permission reads and the sign-out mutation behind this boundary never reach a
 * cold authenticated load — the header paints the avatar and nothing else.
 */
const UserAvatarMenuBody = dynamic(
  () =>
    import("@/components/layout/header/user-avatar-menu-body").then(
      (m) => m.UserAvatarMenuBody,
    ),
  { ssr: false },
);

const AccountTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button"> & {
    name: string;
    image: string | undefined;
    initials: string;
  }
>(function AccountTrigger(
  { name, image, initials, className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "size-8 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-opacity hover:opacity-80",
        className,
      )}
      {...props}
      aria-label="Account menu"
    >
      <Avatar className="size-8 ring-2 ring-sidebar-border">
        <AvatarImage src={image} alt={name} />
        <AvatarFallback className="text-dense font-bold bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
    </button>
  );
});

interface UserAvatarMenuProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function UserAvatarMenu({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
}: UserAvatarMenuProps) {
  const isMobile = useIsMobile();
  const { data: session } = useSession();

  const name = session?.user?.name ?? "User";
  const email = session?.user?.email ?? "";
  const image = resolveImageUrl(session?.user?.image);
  const initials = name.charAt(0).toUpperCase();

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (isControlled) {
        controlledOnOpenChange?.(next);
      } else {
        setInternalOpen(next);
      }
    },
    [isControlled, controlledOnOpenChange],
  );

  const trigger = (
    <AccountTrigger name={name} image={image} initials={initials} />
  );

  if (hideTrigger || isMobile) {
    return (
      <Drawer
        direction="bottom"
        open={open}
        onOpenChange={handleOpenChange}
      >
        {!hideTrigger ? (
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        ) : null}
        <DrawerContent className="flex max-h-[min(92dvh,40rem)] flex-col gap-0 overflow-hidden rounded-t-xl border bg-card p-0 shadow-2xl">
          <UserAvatarMenuBody name={name} email={email} layout="drawer" />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        className="w-56 max-w-56 min-w-0 overflow-x-hidden"
        sideOffset={8}
      >
        <UserAvatarMenuBody name={name} email={email} layout="dropdown" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
