"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail } from "lucide-react";

export function NewsletterCTA() {
  const [email, setEmail] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    toast.success("Thanks for subscribing!");
    setEmail("");
  };

  return (
    <section className="rounded-2xl border border-border bg-muted/30 p-6 text-center sm:p-8">
      <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Mail className="size-5" />
      </span>
      <h3 className="text-lg font-semibold">Subscribe to our newsletter</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Get the latest articles on product, engineering, and company building - straight to your inbox.
      </p>
      <form onSubmit={onSubmit} className="mx-auto mt-4 flex max-w-md flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
        />
        <Button type="submit">Subscribe</Button>
      </form>
    </section>
  );
}
