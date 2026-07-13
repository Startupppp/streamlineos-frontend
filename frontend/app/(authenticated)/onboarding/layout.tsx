import { ForceDefaultTheme } from "@/components/theme/force-default-theme";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ForceDefaultTheme />
      {children}
    </>
  );
}
