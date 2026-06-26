interface BlogHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}

export function BlogHeader({ title, subtitle, eyebrow }: BlogHeaderProps) {
  return (
    <header className="mx-auto max-w-3xl text-center">
      {eyebrow && (
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
          {eyebrow}
        </p>
      )}
      <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{subtitle}</p>
      )}
    </header>
  );
}
