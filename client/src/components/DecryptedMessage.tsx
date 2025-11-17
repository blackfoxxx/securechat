import { useEffect, useState } from "react";
import { useE2EE } from "@/contexts/E2EEContext";
import { Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  decryptSymmetricKey,
  decryptMessage,
} from "@/lib/crypto";

interface DecryptedMessageProps {
  encryptedContent: string;
  iv: string;
  encryptedKey: string;
  senderKeyFingerprint?: string;
  onUnlockRequest: () => void;
}

export function DecryptedMessage({
  encryptedContent,
  iv,
  encryptedKey,
  senderKeyFingerprint,
  onUnlockRequest,
}: DecryptedMessageProps) {
  const { privateKey } = useE2EE();
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    const attemptDecryption = async () => {
      if (!privateKey) {
        setDecryptedContent(null);
        setDecryptionError(null);
        return;
      }

      setIsDecrypting(true);
      setDecryptionError(null);

      try {
        // Decrypt the symmetric key with our private key
        const symmetricKey = await decryptSymmetricKey(encryptedKey, privateKey);
        
        // Decrypt the message content with the symmetric key
        const content = await decryptMessage(encryptedContent, symmetricKey, iv);
        
        setDecryptedContent(content);
      } catch (error) {
        console.error("Failed to decrypt message:", error);
        setDecryptionError("Failed to decrypt message. The key may have changed.");
      } finally {
        setIsDecrypting(false);
      }
    };

    attemptDecryption();
  }, [privateKey, encryptedContent, iv, encryptedKey]);

  if (isDecrypting) {
    return (
      <div className="text-sm">
        <p className="flex items-center gap-2">
          <Lock className="h-3 w-3 animate-pulse" />
          <span className="text-xs opacity-70">Decrypting...</span>
        </p>
      </div>
    );
  }

  if (decryptionError) {
    return (
      <div className="text-sm space-y-2">
        <p className="flex items-center gap-2">
          <AlertCircle className="h-3 w-3 text-destructive" />
          <span className="text-xs opacity-70">{decryptionError}</span>
        </p>
        {senderKeyFingerprint && (
          <p className="text-xs opacity-50">
            Sender fingerprint: {senderKeyFingerprint}
          </p>
        )}
      </div>
    );
  }

  if (!privateKey) {
    return (
      <div className="text-sm space-y-2">
        <p className="flex items-center gap-2">
          <Lock className="h-3 w-3" />
          <span className="text-xs opacity-70">🔒 Encrypted message</span>
        </p>
        <p className="text-xs opacity-50">
          End-to-end encrypted. Unlock E2EE to read this message.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onUnlockRequest}
          className="mt-2 h-7 text-xs"
        >
          Unlock E2EE
        </Button>
      </div>
    );
  }

  if (decryptedContent) {
    return (
      <div className="space-y-1">
        <p className="text-sm">{decryptedContent}</p>
        <p className="flex items-center gap-1 text-xs opacity-50">
          <Lock className="h-2.5 w-2.5" />
          <span>End-to-end encrypted</span>
        </p>
      </div>
    );
  }

  return null;
}
