export type Permission = {
  name: string;
  resource: string;
  action: string;
  description: string;
  scopable?: boolean;
  baselineScope?: "own" | "all";
  sensitive?: true;
};
