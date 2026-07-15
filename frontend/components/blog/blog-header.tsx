interface BlogHeaderProps {
  title: string;
  subtitle?: string;
}

export function BlogHeader({ title, subtitle }: BlogHeaderProps) {
  return (
    <header className="mx-auto max-w-3xl text-center">
      <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{subtitle}</p>
      )}
    </header>
  );
}
