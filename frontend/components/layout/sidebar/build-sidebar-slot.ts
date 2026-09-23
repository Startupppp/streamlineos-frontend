export interface BuildSidebarSlotProps {
  isCollapsed: boolean;
  onNavigate: () => void;
}

export type BuildSidebarSlot = (
  props: BuildSidebarSlotProps,
) => React.ReactNode;
