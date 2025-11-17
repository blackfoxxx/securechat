import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Video, VideoOff, User } from "lucide-react";
import { useState, useEffect } from "react";

interface Participant {
  id: number;
  name: string;
  avatar?: string;
  isAudioMuted?: boolean;
  isVideoMuted?: boolean;
  joinedAt: Date;
}

interface ParticipantsListProps {
  participants: Participant[];
  currentUserId?: number;
  className?: string;
}

export function ParticipantsList({ participants, currentUserId, className }: ParticipantsListProps) {
  const [sortedParticipants, setSortedParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    // Sort participants: current user first, then by join time
    const sorted = [...participants].sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    });
    setSortedParticipants(sorted);
  }, [participants, currentUserId]);

  const formatDuration = (joinedAt: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - joinedAt.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          Participants ({participants.length})
        </h3>
      </div>

      <ScrollArea className="h-full max-h-[400px]">
        <div className="space-y-2">
          {sortedParticipants.map((participant) => (
            <div
              key={participant.id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                participant.id === currentUserId
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted"
              }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {participant.avatar ? (
                  <img
                    src={participant.avatar}
                    alt={participant.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {participant.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                
                {/* Online indicator */}
                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
              </div>

              {/* Name and status */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    {participant.name}
                    {participant.id === currentUserId && (
                      <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                    )}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDuration(participant.joinedAt)}
                </p>
              </div>

              {/* Audio/Video status icons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {participant.isAudioMuted ? (
                  <div className="p-1 rounded bg-red-100 text-red-600">
                    <MicOff className="h-3 w-3" />
                  </div>
                ) : (
                  <div className="p-1 rounded bg-green-100 text-green-600">
                    <Mic className="h-3 w-3" />
                  </div>
                )}
                
                {participant.isVideoMuted ? (
                  <div className="p-1 rounded bg-red-100 text-red-600">
                    <VideoOff className="h-3 w-3" />
                  </div>
                ) : (
                  <div className="p-1 rounded bg-green-100 text-green-600">
                    <Video className="h-3 w-3" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Summary */}
      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Active participants</span>
          <span className="font-medium">{participants.length}</span>
        </div>
      </div>
    </Card>
  );
}
