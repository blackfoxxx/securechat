import { useSocket } from "@/contexts/SocketContext";

interface OnlineIndicatorProps {
  userId: number;
  size?: "sm" | "md" | "lg";
  showOffline?: boolean;
}

export default function OnlineIndicator({ 
  userId, 
  size = "md", 
  showOffline = false 
}: OnlineIndicatorProps) {
  const { onlineUsers } = useSocket();
  const isOnline = onlineUsers.has(userId);

  if (!isOnline && !showOffline) {
    return null;
  }

  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full border-2 border-white ${
        isOnline ? "bg-green-500" : "bg-gray-400"
      }`}
      title={isOnline ? "Online" : "Offline"}
    />
  );
}
