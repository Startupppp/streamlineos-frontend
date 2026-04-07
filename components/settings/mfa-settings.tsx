"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, ShieldOff } from "lucide-react";
import { useMfaStatus, useMfaSetup, useMfaVerify, useMfaDisable } from "@/lib/api/hooks/mfa";
import { toast } from "sonner";

export function MfaSettings() {
  const { data: status, isLoading } = useMfaStatus();
  const setup = useMfaSetup();
  const verify = useMfaVerify();
  const disable = useMfaDisable();

  const [step, setStep] = useState<"idle" | "setup" | "disable">("idle");
  const [qrData, setQrData] = useState<{ qrDataUrl: string; secret: string } | null>(null);
  const [token, setToken] = useState("");

  const handleSetup = async () => {
    const data = await setup.mutateAsync();
    setQrData(data);
    setStep("setup");
    setToken("");
  };

  const handleVerify = async () => {
    if (token.length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator app");
      return;
    }
    await verify.mutateAsync(token);
    toast.success("MFA enabled successfully");
    setStep("idle");
    setQrData(null);
    setToken("");
  };

  const handleDisable = async () => {
    if (token.length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator app");
      return;
    }
    await disable.mutateAsync(token);
    toast.success("MFA disabled");
    setStep("idle");
    setToken("");
  };

  if (isLoading) return null;

  const isEnabled = status?.enabled ?? false;

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <div className="flex items-center gap-2">
          {isEnabled ? (
            <ShieldCheck className="h-4 w-4 text-green-500" />
          ) : (
            <Shield className="h-4 w-4 text-muted-foreground" />
          )}
          <CardTitle className="text-sm font-semibold">Two-Factor Authentication</CardTitle>
          {isEnabled && (
            <Badge variant="secondary" className="ml-auto text-xs bg-green-500/10 text-green-600 border-green-500/20">
              Enabled
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          Add an extra layer of security using a TOTP authenticator app like Google Authenticator.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {step === "idle" && (
          <div className="flex gap-2">
            {isEnabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setStep("disable"); setToken(""); }}
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <ShieldOff className="h-3.5 w-3.5 mr-1.5" />
                Disable MFA
              </Button>
            ) : (
              <Button size="sm" onClick={handleSetup} disabled={setup.isPending}>
                <Shield className="h-3.5 w-3.5 mr-1.5" />
                Enable MFA
              </Button>
            )}
          </div>
        )}

        {step === "setup" && qrData && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-3">
                1. Scan this QR code with Google Authenticator or any TOTP app.
              </p>
              <div className="inline-block p-2 bg-white rounded-lg border border-border">
                <Image src={qrData.qrDataUrl} alt="MFA QR Code" width={160} height={160} />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Or enter this key manually:</p>
              <code className="text-xs font-mono bg-muted px-2 py-1 rounded select-all">
                {qrData.secret}
              </code>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mfa-token" className="text-xs">2. Enter the 6-digit code from your app</Label>
              <div className="flex gap-2">
                <Input
                  id="mfa-token"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-32 text-center font-mono text-sm"
                  maxLength={6}
                />
                <Button size="sm" onClick={handleVerify} disabled={verify.isPending || token.length !== 6}>
                  Verify &amp; Enable
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setStep("idle"); setQrData(null); }}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "disable" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Enter your current authenticator code to disable MFA.
            </p>
            <div className="flex gap-2">
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-32 text-center font-mono text-sm"
                maxLength={6}
                aria-label="TOTP code to disable MFA"
              />
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDisable}
                disabled={disable.isPending || token.length !== 6}
              >
                Disable MFA
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setStep("idle")}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
