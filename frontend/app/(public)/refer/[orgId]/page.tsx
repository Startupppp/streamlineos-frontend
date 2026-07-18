"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient, getApiError } from "@/lib/api-client";
import { Share2 } from "lucide-react";

type Props = { params: Promise<{ orgId: string }> };

interface RegisterResponse {
  referralToken: string;
  name: string;
  orgName: string;
}

export default function ExternalReferrerRegisterPage({ params }: Props) {
  const { orgId } = use(params);
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await apiClient.post<RegisterResponse>("/public/referrals/register", {
        orgId,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
      });
      router.replace(`/refer/link/${result.referralToken}`);
    } catch (e) {
      setError(getApiError(e) || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) { setName(e.target.value); }
  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) { setEmail(e.target.value); }
  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) { setPhone(e.target.value); }

  return (
    <main className="min-h-dvh bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md py-12">
        <Card>
          <CardHeader className="pb-3 text-center">
            <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Share2 className="h-5 w-5" />
            </div>
            <CardTitle>Become a Referrer</CardTitle>
            <CardDescription>Register to get your personal referral link and refer candidates for open roles.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={handleNameChange} placeholder="Jane Smith" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={handleEmailChange} placeholder="jane@example.com" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" value={phone} onChange={handlePhoneChange} placeholder="+1 555 000 0000" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Registering…" : "Get My Referral Link"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
