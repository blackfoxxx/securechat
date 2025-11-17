import { useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Shield, Lock, Key, CheckCircle, Eye, EyeOff, Download, Copy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface E2EESetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (password: string, recoveryCodes: string[]) => Promise<void>;
  canSkip?: boolean;
}

type WizardStep = "welcome" | "password" | "recovery" | "confirm" | "generating" | "complete";

export function E2EESetupWizard({ open, onOpenChange, onComplete, canSkip = false }: E2EESetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("welcome");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const steps: WizardStep[] = ["welcome", "password", "recovery", "confirm", "generating", "complete"];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const generateRecoveryCodes = () => {
    const codes: string[] = [];
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let i = 0; i < 8; i++) {
      let code = "";
      for (let j = 0; j < 12; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
        if ((j + 1) % 4 === 0 && j < 11) code += "-";
      }
      codes.push(code);
    }
    return codes;
  };

  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score, label: "Weak", color: "text-red-500" };
    if (score <= 3) return { score, label: "Fair", color: "text-orange-500" };
    if (score <= 4) return { score, label: "Good", color: "text-yellow-500" };
    return { score, label: "Strong", color: "text-green-500" };
  };

  const handleNext = async () => {
    if (currentStep === "welcome") {
      setCurrentStep("password");
    } else if (currentStep === "password") {
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      const strength = getPasswordStrength(password);
      if (strength.score < 3) {
        toast.error("Please use a stronger password");
        return;
      }
      const codes = generateRecoveryCodes();
      setRecoveryCodes(codes);
      setCurrentStep("recovery");
    } else if (currentStep === "recovery") {
      setCurrentStep("confirm");
    } else if (currentStep === "confirm") {
      if (!recoveryConfirmed) {
        toast.error("Please confirm you have saved your recovery codes");
        return;
      }
      setCurrentStep("generating");
      setIsProcessing(true);
      try {
        await onComplete(password, recoveryCodes);
        setCurrentStep("complete");
      } catch (error) {
        console.error("Failed to setup E2EE:", error);
        toast.error("Failed to setup E2EE. Please try again.");
        setCurrentStep("password");
      } finally {
        setIsProcessing(false);
      }
    } else if (currentStep === "complete") {
      onOpenChange(false);
      resetWizard();
    }
  };

  const handleBack = () => {
    if (currentStep === "password") setCurrentStep("welcome");
    else if (currentStep === "recovery") setCurrentStep("password");
    else if (currentStep === "confirm") setCurrentStep("recovery");
  };

  const handleSkip = () => {
    onOpenChange(false);
    resetWizard();
    toast.info("You can enable E2EE later from your profile settings");
  };

  const resetWizard = () => {
    setCurrentStep("welcome");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setRecoveryCodes([]);
    setRecoveryConfirmed(false);
    setIsProcessing(false);
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    toast.success("Recovery codes copied to clipboard");
  };

  const downloadRecoveryCodes = () => {
    const blob = new Blob([recoveryCodes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "e2ee-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Recovery codes downloaded");
  };

  const passwordStrength = password ? getPasswordStrength(password) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle>Setup End-to-End Encryption</DialogTitle>
          </div>
          <Progress value={progress} className="h-2" />
        </DialogHeader>

        {/* Welcome Step */}
        {currentStep === "welcome" && (
          <div className="space-y-4 py-4">
            <DialogDescription className="text-base">
              Protect your conversations with end-to-end encryption. Your messages will be secured with
              industry-standard encryption that only you and your recipients can read.
            </DialogDescription>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Lock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Complete Privacy</p>
                  <p className="text-xs text-muted-foreground">
                    Messages are encrypted on your device before sending
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Key className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Your Keys, Your Control</p>
                  <p className="text-xs text-muted-foreground">
                    Only you have access to your encryption keys
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Verified Security</p>
                  <p className="text-xs text-muted-foreground">
                    Verify contacts with security codes to prevent attacks
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Password Step */}
        {currentStep === "password" && (
          <div className="space-y-4 py-4">
            <DialogDescription>
              Create a strong password to protect your encryption keys. This password is separate from your
              account password and cannot be recovered if lost.
            </DialogDescription>
            <div className="space-y-2">
              <Label htmlFor="e2ee-password">Encryption Password</Label>
              <div className="relative">
                <Input
                  id="e2ee-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwordStrength && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Password strength:</span>
                    <span className={cn("font-medium", passwordStrength.color)}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full transition-all", {
                        "bg-red-500 w-1/5": passwordStrength.score === 1,
                        "bg-orange-500 w-2/5": passwordStrength.score === 2,
                        "bg-yellow-500 w-3/5": passwordStrength.score === 3,
                        "bg-green-500 w-4/5": passwordStrength.score === 4,
                        "bg-green-600 w-full": passwordStrength.score === 5,
                      })}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5" />
                <p className="text-xs text-amber-900 dark:text-amber-200">
                  <strong>Important:</strong> This password cannot be recovered. Make sure to remember it or
                  use the recovery codes we'll provide next.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recovery Codes Step */}
        {currentStep === "recovery" && (
          <div className="space-y-4 py-4">
            <DialogDescription>
              Save these recovery codes in a safe place. You'll need them to access your encrypted messages
              if you forget your password.
            </DialogDescription>
            <div className="bg-muted p-4 rounded-lg space-y-2 max-h-64 overflow-y-auto">
              {recoveryCodes.map((code, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 font-mono text-sm p-2 bg-background rounded"
                >
                  <span className="text-muted-foreground w-6">{index + 1}.</span>
                  <span className="flex-1">{code}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyRecoveryCodes} className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                Copy Codes
              </Button>
              <Button variant="outline" size="sm" onClick={downloadRecoveryCodes} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        )}

        {/* Confirmation Step */}
        {currentStep === "confirm" && (
          <div className="space-y-4 py-4">
            <DialogDescription>
              Before we continue, please confirm that you have saved your recovery codes securely.
            </DialogDescription>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-4 rounded-lg space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    Without these codes, you may lose access to your encrypted messages
                  </p>
                  <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1 list-disc list-inside">
                    <li>Store codes in a password manager</li>
                    <li>Write them down and keep in a safe place</li>
                    <li>Never share them with anyone</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="recovery-confirm"
                checked={recoveryConfirmed}
                onChange={(e) => setRecoveryConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="recovery-confirm" className="text-sm font-normal cursor-pointer">
                I have saved my recovery codes in a safe place
              </Label>
            </div>
          </div>
        )}

        {/* Generating Step */}
        {currentStep === "generating" && (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent" />
              <div className="text-center space-y-2">
                <p className="font-medium">Generating encryption keys...</p>
                <p className="text-sm text-muted-foreground">
                  This may take a few moments. Please don't close this window.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {currentStep === "complete" && (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-green-100 dark:bg-green-950/20 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-500" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">Setup Complete!</p>
                <p className="text-sm text-muted-foreground">
                  Your end-to-end encryption is now active. Your messages are secure and private.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {canSkip && currentStep !== "generating" && currentStep !== "complete" && (
              <Button variant="ghost" onClick={handleSkip}>
                Skip for now
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {currentStep !== "welcome" && currentStep !== "generating" && currentStep !== "complete" && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
            <Button onClick={handleNext} disabled={isProcessing}>
              {currentStep === "complete" ? "Done" : "Continue"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
