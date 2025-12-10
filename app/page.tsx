import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Vaivamm CRM</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/signin">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Sign Up</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-5xl font-bold tracking-tight">
              Advanced HR and Project Management
            </h1>
            <p className="mb-8 text-xl text-muted-foreground">
              Streamline your workforce management, track projects, and boost productivity
              with our comprehensive CRM solution.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/signup">
                <Button size="lg">Get Started</Button>
              </Link>
              <Link href="/signin">
                <Button size="lg" variant="outline">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-5xl">
              <h2 className="mb-12 text-center text-3xl font-bold">Features</h2>
              <div className="grid gap-8 md:grid-cols-3">
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="mb-2 text-xl font-semibold">HR Management</h3>
                  <p className="text-muted-foreground">
                    Manage attendance, leaves, payroll, and employee performance all in one place.
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="mb-2 text-xl font-semibold">Project Management</h3>
                  <p className="text-muted-foreground">
                    Track projects, sprints, and tickets with Kanban boards and time tracking.
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="mb-2 text-xl font-semibold">AI Assistant</h3>
                  <p className="text-muted-foreground">
                    Get intelligent insights and recommendations powered by AI.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Vaivamm CRM. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
