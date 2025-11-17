import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ParticipantsList } from "@/components/ParticipantsList";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * VideoCall component using Jitsi Meet
 * 
 * Jitsi Meet is a self-hosted, open-source video conferencing solution
 * that works completely offline on M2M networks once deployed.
 * 
 * Configuration:
 * - Set VITE_JITSI_DOMAIN in environment variables
 * - Default: meet.jit.si (public server, requires internet)
 * - For M2M: Use your local Jitsi server (e.g., jitsi.local:8443)
 */

// Get Jitsi domain from environment or use default
const JITSI_DOMAIN = import.meta.env.VITE_JITSI_DOMAIN || "meet.jit.si";

interface JitsiMeetExternalAPI {
  executeCommand: (command: string, ...args: any[]) => void;
  addListener: (event: string, handler: (...args: any[]) => void) => void;
  dispose: () => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: new (domain: string, options: any) => JitsiMeetExternalAPI;
  }
}

export default function VideoCall() {
  const { id } = useParams<{ id: string }>();
  const conversationId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callId, setCallId] = useState<number | null>(null);
  const [showParticipants, setShowParticipants] = useState(true);
  const [participants, setParticipants] = useState<Array<{
    id: number;
    name: string;
    avatar?: string;
    joinedAt: Date;
  }>>([]);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<JitsiMeetExternalAPI | null>(null);
  const { user } = useAuth();

  const startCallMutation = trpc.calls.startCall.useMutation();
  const endCallMutation = trpc.calls.endCall.useMutation();

  useEffect(() => {
    // Get room name from URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomName = urlParams.get("room") || `room-${Date.now()}`;
    const displayName = urlParams.get("name") || "User";

    // Start call session in database
    if (conversationId > 0) {
      startCallMutation.mutate(
        {
          conversationId,
          roomName,
          callType: "video",
        },
        {
          onSuccess: (data) => {
            setCallId(data.callId);
            console.log("Call session started:", data.callId);
          },
          onError: (err) => {
            console.error("Failed to start call session:", err);
            toast.error("Failed to start call session");
          },
        }
      );
    }

    // Load Jitsi Meet External API script
    const script = document.createElement("script");
    script.src = `https://${JITSI_DOMAIN}/external_api.js`;
    script.async = true;
    script.onload = () => initializeJitsi(roomName, displayName);
    script.onerror = () => {
      setError(`Failed to load Jitsi Meet from ${JITSI_DOMAIN}. Please check your Jitsi server configuration.`);
      setIsLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup Jitsi API on unmount
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
      document.body.removeChild(script);
    };
  }, []);

  const initializeJitsi = (roomName: string, displayName: string) => {
    if (!jitsiContainerRef.current || !window.JitsiMeetExternalAPI) {
      setError("Jitsi Meet API not available");
      setIsLoading(false);
      return;
    }

    try {
      const options = {
        roomName: roomName,
        width: "100%",
        height: "100%",
        parentNode: jitsiContainerRef.current,
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
          ],
        },
        userInfo: {
          displayName: displayName,
        },
      };

      const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, options);
      jitsiApiRef.current = api;

      // Listen for conference events
      api.addListener("videoConferenceJoined", () => {
        console.log("Joined video conference");
        setIsLoading(false);
      });

      api.addListener("videoConferenceLeft", () => {
        console.log("Left video conference");
        handleEndCall();
      });

      api.addListener("readyToClose", () => {
        handleEndCall();
      });

    } catch (err) {
      console.error("Error initializing Jitsi:", err);
      setError("Failed to initialize video call. Please try again.");
      setIsLoading(false);
    }
  };

  const handleEndCall = () => {
    // End call session in database
    if (callId) {
      endCallMutation.mutate(
        { callId },
        {
          onSuccess: (data) => {
            console.log("Call ended. Duration:", data.duration, "seconds");
            toast.success(`Call ended. Duration: ${formatDuration(data.duration)}`);
          },
          onError: (err) => {
            console.error("Failed to end call session:", err);
          },
          onSettled: () => {
            // Always navigate back regardless of success/failure
            if (jitsiApiRef.current) {
              jitsiApiRef.current.executeCommand("hangup");
            }
            setLocation("/chats");
          },
        }
      );
    } else {
      // No call ID, just navigate back
      if (jitsiApiRef.current) {
        jitsiApiRef.current.executeCommand("hangup");
      }
      setLocation("/chats");
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h2 className="text-2xl font-bold mb-4">Connection Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="space-y-2 text-sm text-left bg-muted p-4 rounded-md mb-6">
            <p className="font-semibold">Configuration:</p>
            <p>Jitsi Domain: <code className="bg-background px-2 py-1 rounded">{JITSI_DOMAIN}</code></p>
            <p className="mt-2 text-xs">
              For M2M networks, set <code className="bg-background px-1 rounded">VITE_JITSI_DOMAIN</code> to your local Jitsi server.
            </p>
          </div>
          <Button onClick={() => setLocation("/chats")} className="w-full">
            Back to Chats
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex relative">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <Card className="p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold mb-2">Connecting...</h2>
            <p className="text-muted-foreground">
              Joining video call
            </p>
          </Card>
        </div>
      )}

      {/* Jitsi Meet container */}
      <div ref={jitsiContainerRef} className="flex-1" />

      {/* Participants panel */}
      {showParticipants && participants.length > 0 && (
        <div className="w-80 bg-background border-l border-border overflow-hidden">
          <ParticipantsList 
            participants={participants}
            currentUserId={user?.id}
            className="h-full border-0"
          />
        </div>
      )}

      {/* Control buttons */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        {/* Toggle participants button */}
        {participants.length > 0 && (
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setShowParticipants(!showParticipants)}
            className="shadow-lg"
            title={showParticipants ? "Hide participants" : "Show participants"}
          >
            <Users className="h-4 w-4" />
          </Button>
        )}
        
        {/* Leave call button */}
        <Button
          variant="destructive"
          onClick={handleEndCall}
          className="shadow-lg"
        >
          Leave Call
        </Button>
      </div>
    </div>
  );
}
