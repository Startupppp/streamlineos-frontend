export interface DisplayProps {
  showRole: boolean;
  showAdded: boolean;
  showTeams: boolean;
}

const DISPLAY_PROPS_KEY = "projects_members_display_props";

export const DEFAULT_DISPLAY: DisplayProps = {
  showRole: true,
  showAdded: true,
  showTeams: true,
};

export const DISPLAY_PROP_ITEMS: { key: keyof DisplayProps; label: string }[] = [
  { key: "showRole", label: "Role" },
  { key: "showAdded", label: "Added" },
  { key: "showTeams", label: "Teams" },
];

export function loadDisplayProps(): DisplayProps {
  if (typeof window === "undefined") return DEFAULT_DISPLAY;
  try {
    const raw = localStorage.getItem(DISPLAY_PROPS_KEY);
    if (!raw) return DEFAULT_DISPLAY;
    const parsed = JSON.parse(raw) as Partial<DisplayProps>;
    return { ...DEFAULT_DISPLAY, ...parsed };
  } catch {
    return DEFAULT_DISPLAY;
  }
}

export function saveDisplayProps(props: DisplayProps): void {
  try {
    localStorage.setItem(DISPLAY_PROPS_KEY, JSON.stringify(props));
  } catch {}
}
