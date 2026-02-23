import { auth } from "../lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "../components/ui/button";
import Image from "next/image";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col font-sans bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Vaivamm Logo" width={32} height={32} className="rounded-lg" />
            <h1 className="text-xl font-bold text-primary">Vaivamm CRM</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/signin">
              <Button variant="ghost" className="text-primary hover:text-primary/80 hover:bg-primary/10">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">Sign Up</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative bg-[#0f2b7f] py-24 lg:py-32 overflow-hidden">
             {/* Decorative background circle */}
             <div className="absolute top-0 right-0 -mr-20 -mt-20 h-[500px] w-[500px] rounded-full bg-white/5 blur-3xl" />
             <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-[300px] w-[300px] rounded-full bg-secondary/20 blur-3xl" />

          <div className="container relative mx-auto px-4 text-center">
            <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
              Advanced <span className="text-secondary">HR</span> and <span className="text-secondary">Project</span> Management
            </h1>
            <p className="mx-auto mb-10 max-w-3xl text-xl text-blue-100">
              Streamline your workforce management, track projects, and boost productivity
              with our comprehensive CRM solution designed for modern enterprises.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto bg-secondary text-secondary-foreground hover:bg-secondary/90 text-lg px-8 py-6 h-auto">Get Started</Button>
              </Link>
              <Link href="/signin">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/20 bg-transparent text-white hover:bg-white/10 text-lg px-8 py-6 h-auto">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-slate-50 py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <div className="text-center mb-16">
                 <h2 className="mb-4 text-3xl font-bold text-primary">Everything you need to run your business</h2>
                 <p className="text-muted-foreground max-w-2xl mx-auto">From recruitment to retirement, and every project in between.</p>
              </div>

              <div className="grid gap-8 md:grid-cols-3">
                <div className="group rounded-xl border bg-card text-card-foreground p-8 shadow-sm transition-all hover:shadow-md hover:border-secondary/50">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <h3 className="mb-3 text-xl font-semibold text-foreground">HR Management</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Complete solution for attendance tracking, leave management, payroll processing, and employee performance reviews.
                  </p>
                </div>
                <div className="group rounded-xl border bg-card text-card-foreground p-8 shadow-sm transition-all hover:shadow-md hover:border-secondary/50">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-briefcase"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                  </div>
                  <h3 className="mb-3 text-xl font-semibold text-foreground">Project Management</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Agile tools including Kanban boards, Sprints, Backlogs, and Time Tracking to keep your teams aligned and productive.
                  </p>
                </div>
                <div className="group rounded-xl border bg-card text-card-foreground p-8 shadow-sm transition-all hover:shadow-md hover:border-secondary/50">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                  </div>
                  <h3 className="mb-3 text-xl font-semibold text-foreground">AI Assistant</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Intelligent insights, automated helper features, and data-driven recommendations powered by advanced AI.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#0f2b7f] py-12 text-white">
        <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                     <Image src="/logo.svg" alt="Vaivamm Logo" width={32} height={32} className="rounded-lg bg-white p-1" />
                     <span className="font-bold text-xl">Vaivamm CRM</span>
                </div>
                <nav className="flex items-center gap-6 text-sm text-gray-300">
                  <Link href="/signin" className="hover:text-white transition-colors">Sign In</Link>
                  <Link href="/signup" className="hover:text-white transition-colors">Get Started</Link>
                </nav>
                <div className="text-sm text-gray-300">
                    <p>&copy; {currentYear} Vaivamm Capital. All rights reserved.</p>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
}
