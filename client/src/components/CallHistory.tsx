import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Phone, Video, Clock, Users, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CallHistoryProps {
  conversationId: number;
}

export function CallHistory({ conversationId }: CallHistoryProps) {
  const { data: callHistory, isLoading } = trpc.calls.getHistory.useQuery({ conversationId });
  const { data: stats } = trpc.calls.getStatistics.useQuery({ conversationId });

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "0s";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getCallStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "ongoing":
        return "text-blue-600";
      case "missed":
        return "text-red-600";
      case "failed":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const getCallStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "ongoing":
        return "Ongoing";
      case "missed":
        return "Missed";
      case "failed":
        return "Failed";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Loading call history...
      </div>
    );
  }

  if (!callHistory || callHistory.length === 0) {
    return (
      <div className="p-8 text-center">
        <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No call history yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Start a video call to see your call history here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Call Statistics */}
      {stats && stats.totalCalls > 0 && (
        <Card className="p-4 bg-muted/50">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Call Statistics
          </h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Calls</p>
              <p className="text-lg font-semibold">{stats.totalCalls}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Time</p>
              <p className="text-lg font-semibold">{formatDuration(stats.totalDuration)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Avg Duration</p>
              <p className="text-lg font-semibold">{formatDuration(Math.floor(stats.avgDuration))}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Call History List */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground px-2">Recent Calls</h3>
        {callHistory.map((call) => (
          <Card key={call.id} className="p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {/* Call Type Icon */}
                <div className={`p-2 rounded-full ${
                  call.callType === "video" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                }`}>
                  {call.callType === "video" ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <Phone className="h-4 w-4" />
                  )}
                </div>

                {/* Call Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium capitalize">{call.callType} Call</span>
                    <span className={`text-xs ${getCallStatusColor(call.status)}`}>
                      • {getCallStatusText(call.status)}
                    </span>
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(call.startedAt), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Duration */}
                  {call.duration && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <Clock className="h-3 w-3" />
                      <span>Duration: {formatDuration(call.duration)}</span>
                    </div>
                  )}

                  {/* Participants */}
                  {call.participants && call.participants.length > 0 && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>
                        {call.participants.length} participant{call.participants.length > 1 ? "s" : ""}
                      </span>
                      <span className="text-xs">
                        ({call.participants.map(p => p.userName || "Unknown").join(", ")})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Call Again Button */}
              {call.status === "completed" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2"
                  onClick={() => {
                    // Navigate to call page
                    const roomName = `chat-${conversationId}-${Date.now()}`;
                    window.location.href = `/call/${conversationId}?room=${roomName}&name=User`;
                  }}
                >
                  <Phone className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
