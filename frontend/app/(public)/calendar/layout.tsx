export default function CalendarPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="calendar-public-theme min-h-dvh bg-background text-foreground">
      {children}
    </div>
  );
}
