import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { Loader2, Shield, CheckCircle, AlertTriangle, QrCode, User } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  generateCombinedFingerprint,
  generateNumericSecurityCode,
  formatSecurityCodeForDisplay,
  generateQRCode,
} from "@/lib/security-code";

interface KeyVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: number;
  contactName: string;
  contactAvatar?: string;
  contactPublicKey?: string;
}

export default function KeyVerificationDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  contactAvatar,
  contactPublicKey,
}: KeyVerificationDialogProps) {
  const { user } = useAuth();
  const [securityCode, setSecurityCode] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Get verification status
  const { data: verificationStatus, refetch: refetchVerification } = 
    trpc.keyVerification.getStatus.useQuery(
      { contactId },
      { enabled: open }
    );

  const verifyMutation = trpc.keyVerification.verify.useMutation({
    onSuccess: () => {
      toast.success("Contact verified successfully");
      refetchVerification();
    },
    onError: () => {
      toast.error("Failed to verify contact");
    },
  });

  const unverifyMutation = trpc.keyVerification.unverify.useMutation({
    onSuccess: () => {
      toast.success("Verification removed");
      refetchVerification();
    },
    onError: () => {
      toast.error("Failed to remove verification");
    },
  });

  useEffect(() => {
    if (open && user?.publicKey && contactPublicKey) {
      generateSecurityCode();
    }
  }, [open, user?.publicKey, contactPublicKey]);

  const generateSecurityCode = async () => {
    if (!user?.publicKey || !contactPublicKey || !user?.id) return;

    setIsGenerating(true);
    try {
      // Generate combined fingerprint
      const fingerprint = await generateCombinedFingerprint(
        user.publicKey,
        contactPublicKey,
        user.id,
        contactId
      );

      // Generate numeric code
      const code = generateNumericSecurityCode(fingerprint);
      setSecurityCode(code);

      // Generate QR code
      const qr = await generateQRCode(code);
      setQrCodeUrl(qr);
    } catch (error) {
      console.error("Failed to generate security code:", error);
      toast.error("Failed to generate security code");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVerify = () => {
    if (!securityCode) return;
    verifyMutation.mutate({
      contactId,
      keyFingerprint: securityCode.replace(/\s/g, '').substring(0, 64),
    });
  };

  const handleUnverify = () => {
    unverifyMutation.mutate({ contactId });
  };

  const codeLines = securityCode ? formatSecurityCodeForDisplay(securityCode) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Verify Security Code
          </DialogTitle>
          <DialogDescription>
            Compare this security code with {contactName} to verify your connection is secure
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact Info */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={contactAvatar} />
              <AvatarFallback>
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{contactName}</p>
              {verificationStatus?.isVerified ? (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </p>
              ) : verificationStatus?.keyChanged ? (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Security code changed
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Not verified</p>
              )}
            </div>
          </div>

          {/* Security Code Display */}
          {isGenerating ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : showQR ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-48 h-48 border-2 border-border rounded-lg"
                />
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowQR(false)}
              >
                Show Numeric Code
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-center space-y-2 font-mono text-sm">
                  {codeLines.map((line, index) => (
                    <div key={index} className="tracking-wider">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowQR(true)}
              >
                <QrCode className="h-4 w-4 mr-2" />
                Show QR Code
              </Button>
            </div>
          )}

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              How to verify:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200">
              <li>Ask {contactName} to open this screen</li>
              <li>Compare the security codes on both devices</li>
              <li>If they match, mark as verified</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {verificationStatus?.isVerified ? (
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleUnverify}
                disabled={unverifyMutation.isPending}
              >
                {unverifyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  "Remove Verification"
                )}
              </Button>
            ) : (
              <Button
                className="flex-1"
                onClick={handleVerify}
                disabled={verifyMutation.isPending || !securityCode}
              >
                {verifyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Verified
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Warning for changed keys */}
          {verificationStatus?.keyChanged && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-semibold">Security code has changed!</span>
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                This could mean {contactName} reinstalled the app, or someone may be intercepting your messages. Verify the new code with {contactName}.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
