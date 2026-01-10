"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Label } from "../../../components/ui/label";
import { toast } from "sonner";

import { ThemeToggle } from "../../../components/theme-toggle";

export default function SignInPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password");
      } else {
        toast.success("Signed in successfully");
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0f2b7f] dark:bg-background flex flex-col items-center justify-center p-4 relative transition-colors duration-300">
      <ThemeToggle className="absolute top-4 right-4 text-white hover:bg-white/10" />
      <div className="flex flex-col items-center mb-8">
          <div className="bg-white p-2 rounded-xl mb-4 shadow-lg">
             <Image src="/logo.svg" alt="Vaivamm Logo" width={64} height={64} className="rounded-lg" />
          </div>
          <h1 className="text-3xl font-bold text-white dark:text-foreground tracking-tight">Welcome Back</h1>
          <p className="text-blue-100 dark:text-muted-foreground mt-2">Sign in to your Vaivamm CRM account</p>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0 bg-white dark:bg-card h-fit">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center text-primary">Sign In</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="focus-visible:ring-primary dark:bg-background"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-secondary hover:text-secondary/80 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="focus-visible:ring-primary dark:bg-background"
              />
            </div>
            <Button 
                type="submit" 
                className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground" 
                disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-8 text-white/40 text-sm">
        &copy; 2025 Vaivamm Capital
      </div>
    </div>
  );
}

