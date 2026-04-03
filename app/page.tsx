import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Users, LayoutGrid, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Vaivamm Capital CRM — HR & Project Management Platform",
  description: "Streamline your HR, project management, and CRM operations with Vaivamm Capital's all-in-one platform.",
};

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground noir-grain">
      <header className="sticky top-0 z-50 w-full glass border-b border-gold/10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="Vaivamm Logo" width={32} height={32} className="rounded-lg" />
            <span className="text-xl font-bold tracking-tight text-foreground">Vaivamm</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {["Features", "Solutions", "Pricing", "Resources"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-medium text-foreground/60 hover:text-gold transition-colors duration-200"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/signin">
              <Button variant="ghost" className="text-foreground/70 hover:text-gold hover:bg-gold/5">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative noir-mesh py-24 lg:py-36 overflow-hidden">
          <div className="absolute top-[-10%] right-[10%] h-[600px] w-[600px] rounded-full bg-gold/[0.04] blur-[100px]" />
          <div className="absolute bottom-[-5%] left-[5%] h-[400px] w-[400px] rounded-full bg-blue/[0.03] blur-[80px]" />
          <div className="absolute top-[40%] left-[50%] h-[200px] w-[200px] -translate-x-1/2 rounded-full bg-gold/[0.06] blur-[60px]" />

          <div className="container relative mx-auto px-4 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/[0.06] px-4 py-1.5 mb-8">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
              <span className="text-sm font-medium text-gold tracking-wide">New v2.0 Released</span>
            </div>

            <h1 className="mb-6 text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.08]">
              Unified CRM for{" "}
              <span className="gold-text">HR</span>,{" "}
              <span className="gold-text">Projects</span>,
              <br className="hidden sm:block" /> and{" "}
              <span className="gold-text">Sales</span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg lg:text-xl text-foreground/55 leading-relaxed">
              Streamline your enterprise operations with an all-in-one platform for human resources,
              project management, and customer relationship management.
            </p>
          </div>
        </section>

        <section className="relative bg-secondary overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue/20 via-transparent to-blue/20 opacity-30" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(189,136,44,0.08)_0%,_transparent_70%)]" />

          <div className="deco-line" />
          <div className="container relative mx-auto px-4 lg:px-8 py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-8 max-w-3xl mx-auto">
              {[
                { value: "Secure", label: "Data & compliance" },
                { value: "Unified", label: "HR, projects & deals" },
                { value: "Simple", label: "One place to run operations" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-3xl lg:text-4xl font-extrabold text-white/95 tracking-tight mb-1">
                    {stat.value}
                  </p>
                  <p className="text-sm text-white/40 font-medium tracking-wide uppercase">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="deco-line" />
        </section>

        <section id="features" className="bg-muted py-24 lg:py-32">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="text-center mb-16">
                <p className="text-sm font-semibold text-gold tracking-widest uppercase mb-3">Platform</p>
                <h2 className="mb-4 text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                  Everything you need to run your business
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto text-lg">
                  From recruitment to retirement, and every project in between.
                </p>
              </div>

              <div className="grid gap-8 md:grid-cols-3">
                {[
                  {
                    icon: Users,
                    title: "HR Management",
                    description:
                      "Automate payroll processing, attendance tracking, leave management, and recruitment workflows. Complete employee lifecycle management.",
                  },
                  {
                    icon: LayoutGrid,
                    title: "Project Tracking",
                    description:
                      "Kanban boards, Gantt charts, sprint planning, and budget management. Keep every team aligned and on schedule.",
                  },
                  {
                    icon: TrendingUp,
                    title: "CRM & Sales",
                    description:
                      "Lead conversion tracking, customer relationship management, pipeline analytics, and sales forecasting tools.",
                  },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="group rounded-xl border border-border bg-card text-card-foreground p-8 shadow-noir transition-all duration-300 hover:shadow-lg hover:border-gold/30 glow-gold"
                  >
                    <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gold/10 text-gold group-hover:gold-gradient group-hover:text-primary-foreground transition-colors duration-300">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mb-3 text-xl font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative noir-mesh py-24 lg:py-32 overflow-hidden">
          <div className="absolute top-[20%] right-[15%] h-[300px] w-[300px] rounded-full bg-gold/[0.05] blur-[80px]" />
          <div className="absolute bottom-[10%] left-[10%] h-[250px] w-[250px] rounded-full bg-blue/[0.04] blur-[60px]" />

          <div className="container relative mx-auto px-4 lg:px-8 text-center">
            <h2 className="mb-5 text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
              Ready to transform your business operations?
            </h2>
            <p className="mx-auto max-w-xl text-lg text-foreground/50 leading-relaxed">
              Join thousands of teams who trust Vaivamm to manage their HR, projects, and sales.
            </p>
          </div>
        </section>
      </main>

      <footer className="bg-secondary text-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pt-16 pb-12">
            <div>
              <h4 className="text-sm font-semibold text-white/80 uppercase tracking-widest mb-5">Product</h4>
              <ul className="space-y-3">
                {["Features", "Integrations", "Pricing", "Changelog"].map((item) => (
                  <li key={item}>
                    <a href={`#${item.toLowerCase()}`} className="text-sm text-white/40 hover:text-gold transition-colors duration-200">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white/80 uppercase tracking-widest mb-5">Company</h4>
              <ul className="space-y-3">
                {[
                  { label: "About Us", href: "/about" },
                  { label: "Careers", href: "/careers" },
                  { label: "Blog", href: "/blog" },
                  { label: "Contact", href: "/contact" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-white/40 hover:text-gold transition-colors duration-200">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white/80 uppercase tracking-widest mb-5">Legal</h4>
              <ul className="space-y-3">
                {[
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Terms of Service", href: "/terms" },
                  { label: "Cookie Policy", href: "/cookies" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-white/40 hover:text-gold transition-colors duration-200">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white/80 uppercase tracking-widest mb-5">Resources</h4>
              <ul className="space-y-3">
                {[
                  { label: "Documentation", href: "/docs" },
                  { label: "API Reference", href: "/api-docs" },
                  { label: "Help Center", href: "/help" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-white/40 hover:text-gold transition-colors duration-200">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="deco-line" />

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 py-8">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo.svg"
                alt="Vaivamm Logo"
                width={28}
                height={28}
                className="rounded-md bg-white/90 border border-gold/20 p-0.5"
              />
              <span className="text-sm text-white/50">
                &copy; {currentYear} Vaivamm Capital. All rights reserved.
              </span>
            </div>

            <div className="flex items-center gap-4">
              <a href="https://twitter.com/vaivammcapital" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-gold transition-colors duration-200" aria-label="Twitter">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="https://github.com/Vibe-Coders-Batch" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-gold transition-colors duration-200" aria-label="GitHub">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              </a>
              <a href="https://linkedin.com/company/vaivamm-capital" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-gold transition-colors duration-200" aria-label="LinkedIn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
