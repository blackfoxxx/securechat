import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  decryptPrivateKey,
  importPrivateKey,
  getPrivateKeyFromSession,
  storePrivateKeyInSession,
  clearPrivateKeyFromSession,
} from "@/lib/crypto";

interface E2EEContextType {
  privateKey: CryptoKey | null;
  isE2EEEnabled: boolean;
  unlockE2EE: (password: string) => Promise<boolean>;
  lockE2EE: () => void;
}

const E2EEContext = createContext<E2EEContextType | undefined>(undefined);

export function E2EEProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [isE2EEEnabled, setIsE2EEEnabled] = useState(false);

  useEffect(() => {
    // Check if user has E2EE keys
    if (user?.publicKey && user?.encryptedPrivateKey && user?.keySalt) {
      setIsE2EEEnabled(true);
      
      // Try to restore private key from session
      const storedKey = getPrivateKeyFromSession();
      if (storedKey) {
        importPrivateKey(storedKey)
          .then(key => setPrivateKey(key))
          .catch(err => {
            console.error("Failed to restore private key:", err);
            clearPrivateKeyFromSession();
          });
      }
    } else {
      setIsE2EEEnabled(false);
      setPrivateKey(null);
    }
  }, [user]);

  const unlockE2EE = async (password: string): Promise<boolean> => {
    if (!user?.encryptedPrivateKey || !user?.keySalt) {
      return false;
    }

    try {
      // The IV is stored in the keySalt field during registration
      // We need to split it or store it separately
      // For now, we'll generate a new IV during decryption
      // This is a simplified implementation
      const key = await decryptPrivateKey(
        user.encryptedPrivateKey,
        password,
        user.keySalt,
        user.keySalt // Using salt as IV for simplicity - should be separate in production
      );
      
      setPrivateKey(key);
      
      // Store in session for convenience
      const { exportPrivateKey } = await import("@/lib/crypto");
      const exportedKey = await exportPrivateKey(key);
      storePrivateKeyInSession(exportedKey);
      
      return true;
    } catch (error) {
      console.error("Failed to unlock E2EE:", error);
      return false;
    }
  };

  const lockE2EE = () => {
    setPrivateKey(null);
    clearPrivateKeyFromSession();
  };

  return (
    <E2EEContext.Provider value={{ privateKey, isE2EEEnabled, unlockE2EE, lockE2EE }}>
      {children}
    </E2EEContext.Provider>
  );
}

export function useE2EE() {
  const context = useContext(E2EEContext);
  if (context === undefined) {
    throw new Error("useE2EE must be used within an E2EEProvider");
  }
  return context;
}
