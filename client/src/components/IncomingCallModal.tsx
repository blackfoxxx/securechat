import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { APP_LOGO } from "@/const";

interface IncomingCallModalProps {
  isOpen: boolean;
  callerName: string;
  callerAvatar?: string;
  callType: "video" | "audio";
  onAccept: () => void;
  onDecline: () => void;
  onTimeout?: () => void;
  timeoutSeconds?: number;
}

export function IncomingCallModal({
  isOpen,
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onDecline,
  onTimeout,
  timeoutSeconds = 30,
}: IncomingCallModalProps) {
  const [timeLeft, setTimeLeft] = useState(timeoutSeconds);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset timer
      setTimeLeft(timeoutSeconds);

      // Start ringtone
      if (audioRef.current) {
        audioRef.current.loop = true;
        audioRef.current.play().catch(err => {
          console.error("Failed to play ringtone:", err);
        });
      }

      // Start countdown timer
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            if (onTimeout) {
              onTimeout();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      timeoutRef.current = interval;

      return () => {
        // Cleanup
        clearInterval(interval);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      };
    }
  }, [isOpen, timeoutSeconds, onTimeout]);

  const handleAccept = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (timeoutRef.current) {
      clearInterval(timeoutRef.current);
    }
    onAccept();
  };

  const handleDecline = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (timeoutRef.current) {
      clearInterval(timeoutRef.current);
    }
    onDecline();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Ringtone Audio */}
      <audio ref={audioRef} src="/ringtone.mp3" preload="auto" />

      {/* Full-screen overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
        <Card className="w-full max-w-md p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
          {/* Call Type Icon */}
          <div className="flex justify-center">
            <div className={`p-4 rounded-full ${
              callType === "video" 
                ? "bg-blue-100 text-blue-600" 
                : "bg-green-100 text-green-600"
            } animate-pulse`}>
              {callType === "video" ? (
                <Video className="h-12 w-12" />
              ) : (
                <Phone className="h-12 w-12" />
              )}
            </div>
          </div>

          {/* Caller Avatar */}
          <div className="flex justify-center">
            {callerAvatar ? (
              <img
                src={callerAvatar}
                alt={callerName}
                className="h-24 w-24 rounded-full object-cover border-4 border-primary"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-primary">
                <span className="text-3xl font-bold text-white">
                  {callerName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Caller Info */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{callerName}</h2>
            <p className="text-muted-foreground">
              Incoming {callType} call...
            </p>
          </div>

          {/* Timer */}
          <div className="text-sm text-muted-foreground">
            {timeLeft > 0 ? (
              <span>Ringing... ({timeLeft}s)</span>
            ) : (
              <span className="text-red-600">Call timed out</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center pt-4">
            {/* Decline Button */}
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full h-16 w-16 p-0"
              onClick={handleDecline}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>

            {/* Accept Button */}
            {timeLeft > 0 && (
              <Button
                variant="default"
                size="lg"
                className="rounded-full h-16 w-16 p-0 bg-green-600 hover:bg-green-700"
                onClick={handleAccept}
              >
                <Phone className="h-6 w-6" />
              </Button>
            )}
          </div>

          {/* Hint Text */}
          <p className="text-xs text-muted-foreground mt-4">
            {timeLeft > 0 ? "Accept or decline the call" : "Call missed"}
          </p>
        </Card>
      </div>
    </>
  );
}
