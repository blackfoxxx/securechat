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
import { Lock, Eye, EyeOff, Shield } from "lucide-react";
import { useE2EE } from "@/contexts/E2EEContext";
import { toast } from "sonner";

interface E2EEUnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlock?: () => void;
}

export function E2EEUnlockDialog({ open, onOpenChange, onUnlock }: E2EEUnlockDialogProps) {
  const { unlockE2EE } = useE2EE();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleUnlock = async () => {
    if (!password.trim()) {
      toast.error("Please enter your password");
      return;
    }

    setIsUnlocking(true);
    try {
      const success = await unlockE2EE(password);
      
      if (success) {
        toast.success("E2EE unlocked successfully");
        setPassword("");
        onOpenChange(false);
        onUnlock?.();
      } else {
        toast.error("Incorrect password. Please try again.");
      }
    } catch (error) {
      console.error("Failed to unlock E2EE:", error);
      toast.error("Failed to unlock E2EE. Please try again.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleUnlock();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle>Unlock End-to-End Encryption</DialogTitle>
          </div>
          <DialogDescription>
            Enter your password to decrypt your private key and enable secure messaging.
            Your messages are protected with industry-standard encryption.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isUnlocking}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isUnlocking}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <Lock className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Security Note:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Your password never leaves your device</li>
                  <li>Private key is encrypted with your password</li>
                  <li>Only you can decrypt your messages</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setPassword("");
              onOpenChange(false);
            }}
            disabled={isUnlocking}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUnlock}
            disabled={isUnlocking || !password.trim()}
          >
            {isUnlocking ? "Unlocking..." : "Unlock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
