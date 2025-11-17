import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/_core/hooks/useAuth";

interface IncomingCall {
  callerId: number;
  callerName: string;
  callerAvatar?: string;
  conversationId: number;
  roomName: string;
  callType: "video" | "audio";
}

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  onlineUsers: Set<number>;
  incomingCall: IncomingCall | null;
  clearIncomingCall: () => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  onlineUsers: new Set(),
  incomingCall: null,
  clearIncomingCall: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  const clearIncomingCall = () => {
    setIncomingCall(null);
  };

  useEffect(() => {
    // Connect to the same origin (backend server)
    const newSocket = io(window.location.origin, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("Socket connected");
      setConnected(true);
      
      // Emit user online event if authenticated
      if (isAuthenticated && user?.id) {
        newSocket.emit("user:online", { userId: user.id });
      }
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
      setConnected(false);
    });

    // Listen for online users list
    newSocket.on("presence:online-users", (userIds: number[]) => {
      setOnlineUsers(new Set(userIds));
    });

    // Listen for user online event
    newSocket.on("presence:user-online", (userId: number) => {
      setOnlineUsers((prev) => new Set([...Array.from(prev), userId]));
    });

    // Listen for user offline event
    newSocket.on("presence:user-offline", (userId: number) => {
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    });

    // Listen for incoming call
    newSocket.on("call:incoming", (data: IncomingCall) => {
      console.log("Incoming call from:", data.callerName);
      setIncomingCall(data);
    });

    // Listen for call cancelled
    newSocket.on("call:cancelled", () => {
      console.log("Call was cancelled by caller");
      setIncomingCall(null);
    });

    setSocket(newSocket);

    return () => {
      if (isAuthenticated && user?.id) {
        newSocket.emit("user:offline", { userId: user.id });
      }
      newSocket.close();
    };
  }, [isAuthenticated, user?.id]);

  return (
    <SocketContext.Provider value={{ socket, connected, onlineUsers, incomingCall, clearIncomingCall }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
