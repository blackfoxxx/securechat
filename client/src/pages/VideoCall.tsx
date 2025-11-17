import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Phone, Video, VideoOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";

export default function VideoCall() {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // In a real implementation, you would get the LiveKit URL and token from your backend
    const connectToRoom = async () => {
      const newRoom = new Room();
      
      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
          track.attach(remoteVideoRef.current);
        }
      });

      try {
        // Replace with actual LiveKit server URL and token from backend
        // await newRoom.connect("wss://your-livekit-server.com", "your-token");
        // setRoom(newRoom);
        // setIsConnected(true);
        
        // For demo purposes, we'll just show the UI structure
        console.log("LiveKit integration ready - connect with real credentials");
      } catch (error) {
        console.error("Failed to connect to LiveKit:", error);
      }
    };

    // Uncomment to enable actual connection
    // connectToRoom();

    return () => {
      room?.disconnect();
    };
  }, []);

  const toggleMic = () => {
    if (room) {
      room.localParticipant.setMicrophoneEnabled(!isMicEnabled);
      setIsMicEnabled(!isMicEnabled);
    }
  };

  const toggleVideo = () => {
    if (room) {
      room.localParticipant.setCameraEnabled(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const endCall = () => {
    room?.disconnect();
    window.location.href = "/chats";
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <div className="flex-1 relative">
        {/* Remote video (main view) */}
        <video
          ref={remoteVideoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
        />

        {/* Local video (picture-in-picture) */}
        <Card className="absolute top-4 right-4 w-48 h-36 overflow-hidden">
          <video
            ref={localVideoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
        </Card>

        {/* Connection status */}
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Card className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Video Call</h2>
              <p className="text-muted-foreground mb-4">
                Configure LiveKit credentials to enable calls
              </p>
              <Button onClick={() => window.location.href = "/chats"}>
                Back to Chats
              </Button>
            </Card>
          </div>
        )}
      </div>

      {/* Call controls */}
      <div className="p-6 bg-gray-800 flex justify-center gap-4">
        <Button
          variant={isMicEnabled ? "default" : "destructive"}
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={toggleMic}
        >
          {isMicEnabled ? <Mic /> : <MicOff />}
        </Button>

        <Button
          variant={isVideoEnabled ? "default" : "destructive"}
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={toggleVideo}
        >
          {isVideoEnabled ? <Video /> : <VideoOff />}
        </Button>

        <Button
          variant="destructive"
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={endCall}
        >
          <Phone className="rotate-135" />
        </Button>
      </div>
    </div>
  );
}
