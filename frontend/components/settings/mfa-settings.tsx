"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, ShieldCheck, ShieldOff, Copy, Check } from "lucide-react";
import { useMfaStatus, useMfaSetup, useMfaVerify, useMfaDisable } from "@/hooks/api/mfa";
import { toast } from "sonner";

export function MfaSettings() {
  const { data: status, isLoading } = useMfaStatus();
  const setup = useMfaSetup();
  const verify = useMfaVerify();
  const disable = useMfaDisable();

  const [step, setStep] = useState<"idle" | "setup" | "disable">("idle");
  const [qrData, setQrData] = useState<{ qrDataUrl: string; secret: string } | null>(null);
  const [token, setToken] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSetup = async () => {
    const data = await setup.mutateAsync();
    setQrData(data);
    if (data.backupCodes) {
      setBackupCodes(data.backupCodes);
    }
    setStep("setup");
    setToken("");
  };

  const handleVerify = async () => {
    if (token.length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator app");
      return;
    }
    await verify.mutateAsync({ token });
    toast.success("MFA enabled successfully");
    setStep("idle");
    setQrData(null);
    setToken("");
    if (backupCodes.length > 0) {
      setShowBackupModal(true);
    }
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

  const handleCopyAll = useCallback(() => {
    navigator.clipboard.writeText(backupCodes.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [backupCodes]);

  const handleTokenChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setToken(e.target.value.replace(/\D/g, "").slice(0, 6));
  }, []);

  if (isLoading) return null;

  const isEnabled = status?.enabled ?? false;

  return (
    <>
      <div className="rounded-lg border border-border">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              {isEnabled ? (
                <ShieldCheck className="h-4 w-4 shrink-0 text-green-500 dark:text-green-400" />
              ) : (
                <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <p className="text-sm font-semibold text-foreground">
                Two-Factor Authentication
              </p>
              {isEnabled && (
                <Badge
                  variant="secondary"
                  className="border-green-500/20 bg-green-500/10 text-xs text-green-600"
                >
                  Enabled
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Add an extra layer of security using a TOTP authenticator app like
              Google Authenticator.
            </p>
          </div>
          {step === "idle" && (
            <div className="shrink-0 [&_button]:w-full sm:[&_button]:w-auto">
              {isEnabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStep("disable");
                    setToken("");
                  }}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                  Disable MFA
                </Button>
              ) : (
                <Button size="sm" onClick={handleSetup} disabled={setup.isPending}>
                  <Shield className="mr-1.5 h-3.5 w-3.5" />
                  Enable MFA
                </Button>
              )}
            </div>
          )}
        </div>
        {step !== "idle" && (
          <div className="space-y-4 border-t border-border px-4 py-3">
            {step === "setup" && qrData && (
              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">
                    1. Scan this QR code with Google Authenticator or any TOTP app.
                  </p>
                  <div className="inline-block rounded-lg border border-border bg-background p-2">
                    <Image
                      src={qrData.qrDataUrl}
                      alt="MFA QR Code"
                      width={160}
                      height={160}
                    />
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    Or enter this key manually:
                  </p>
                  <code className="select-all rounded bg-muted px-2 py-1 font-mono text-xs">
                    {qrData.secret}
                  </code>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mfa-token" className="text-xs">
                    2. Enter the 6-digit code from your app
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="mfa-token"
                      value={token}
                      onChange={handleTokenChange}
                      placeholder="000000"
                      className="w-32 text-center font-mono text-sm"
                      maxLength={6}
                    />
                    <Button
                      size="sm"
                      onClick={handleVerify}
                      disabled={verify.isPending || token.length !== 6}
                    >
                      Verify &amp; Enable
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setStep("idle");
                        setQrData(null);
                      }}
                    >
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
                    onChange={handleTokenChange}
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
                  <Button size="sm" variant="ghost" onClick={() => setStep("idle")}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={showBackupModal} onOpenChange={setShowBackupModal}>
        <DialogContent className="gap-3 p-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Your Backup Codes</DialogTitle>
            <DialogDescription className="text-xs">
              Store these codes in a safe place. Each code can only be used once
              to sign in if you lose access to your authenticator app.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code) => (
              <code
                key={code}
                className="rounded bg-muted px-3 py-2 text-center font-mono text-sm tracking-wider"
              >
                {code}
              </code>
            ))}
          </div>
          <DialogFooter className="gap-2 border-t border-border pt-3 sm:justify-end">
            <Button variant="outline" size="sm" onClick={handleCopyAll}>
              {copied ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy All
                </>
              )}
            </Button>
            <Button size="sm" onClick={() => setShowBackupModal(false)}>
              I&apos;ve saved these codes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
