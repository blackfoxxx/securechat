import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, Shield, ShieldOff, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

interface TwoFactorAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TwoFactorAuthDialog({ open, onOpenChange }: TwoFactorAuthDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<"main" | "setup" | "verify" | "disable">("main");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);

  const setup2FAMutation = trpc.user.setup2FA.useMutation({
    onSuccess: (data) => {
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep("setup");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const verify2FAMutation = trpc.user.verify2FA.useMutation({
    onSuccess: () => {
      toast.success("Two-factor authentication enabled successfully");
      setStep("main");
      setVerificationCode("");
      onOpenChange(false);
      // Refresh user data
      window.location.reload();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const disable2FAMutation = trpc.user.disable2FA.useMutation({
    onSuccess: () => {
      toast.success("Two-factor authentication disabled");
      setStep("main");
      setDisablePassword("");
      onOpenChange(false);
      // Refresh user data
      window.location.reload();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSetup = () => {
    setup2FAMutation.mutate();
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    verify2FAMutation.mutate({ token: verificationCode });
  };

  const handleDisable = (e: React.FormEvent) => {
    e.preventDefault();
    disable2FAMutation.mutate({ password: disablePassword });
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    toast.success("Secret copied to clipboard");
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleClose = () => {
    setStep("main");
    setQrCode("");
    setSecret("");
    setVerificationCode("");
    setDisablePassword("");
    onOpenChange(false);
  };

  const is2FAEnabled = user?.twoFactorEnabled === 1;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {step === "main" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {is2FAEnabled ? (
                  <>
                    <Shield className="h-5 w-5 text-green-500" />
                    Two-Factor Authentication Enabled
                  </>
                ) : (
                  <>
                    <ShieldOff className="h-5 w-5 text-gray-400" />
                    Two-Factor Authentication
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {is2FAEnabled
                  ? "Your account is protected with two-factor authentication"
                  : "Add an extra layer of security to your account"}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {is2FAEnabled ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                    <p className="text-sm text-green-800">
                      Two-factor authentication is currently enabled. You'll need to enter a
                      verification code from your authenticator app when you log in.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setStep("disable")}
                    className="w-full"
                  >
                    <ShieldOff className="mr-2 h-4 w-4" />
                    Disable Two-Factor Authentication
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                    <p className="text-sm text-blue-800">
                      Two-factor authentication adds an extra layer of security by requiring a
                      verification code from your phone in addition to your password.
                    </p>
                  </div>
                  <Button
                    onClick={handleSetup}
                    disabled={setup2FAMutation.isPending}
                    className="w-full"
                  >
                    {setup2FAMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Enable Two-Factor Authentication
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {step === "setup" && (
          <>
            <DialogHeader>
              <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Scan the QR code with your authenticator app
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center space-y-4">
                {qrCode && (
                  <img
                    src={qrCode}
                    alt="QR Code"
                    className="w-64 h-64 border rounded-lg"
                  />
                )}
                <div className="w-full space-y-2">
                  <Label>Or enter this code manually:</Label>
                  <div className="flex gap-2">
                    <Input value={secret} readOnly className="font-mono text-sm" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copySecret}
                    >
                      {copiedSecret ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Use apps like Google Authenticator, Authy, or Microsoft Authenticator
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep("verify")}>
                Next: Verify
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "verify" && (
          <>
            <DialogHeader>
              <DialogTitle>Verify Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Enter the 6-digit code from your authenticator app
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleVerify}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="verificationCode">Verification Code</Label>
                  <Input
                    id="verificationCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-widest font-mono"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("setup")}
                  disabled={verify2FAMutation.isPending}
                >
                  Back
                </Button>
                <Button type="submit" disabled={verify2FAMutation.isPending}>
                  {verify2FAMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Enable"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}

        {step === "disable" && (
          <>
            <DialogHeader>
              <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Enter your password to confirm disabling 2FA
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleDisable}>
              <div className="space-y-4 py-4">
                <div className="rounded-lg bg-yellow-50 p-4 border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    Warning: Disabling two-factor authentication will make your account less
                    secure.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="disablePassword">Password</Label>
                  <Input
                    id="disablePassword"
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("main")}
                  disabled={disable2FAMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={disable2FAMutation.isPending}
                >
                  {disable2FAMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disabling...
                    </>
                  ) : (
                    "Disable 2FA"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
