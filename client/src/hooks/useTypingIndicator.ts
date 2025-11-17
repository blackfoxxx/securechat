import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "@/contexts/SocketContext";

interface TypingUser {
  userId: number;
  userName: string;
}

export function useTypingIndicator(conversationId: number, currentUserId: number, currentUserName: string) {
  const { socket } = useSocket();
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Handle incoming typing events
  useEffect(() => {
    const handleTypingStart = ({ conversationId: convId, userId, userName }: { conversationId: number; userId: number; userName: string }) => {
      if (convId === conversationId && userId !== currentUserId) {
        setTypingUsers(prev => {
          const next = new Map(prev);
          next.set(userId, userName);
          return next;
        });

        // Auto-clear typing indicator after 5 seconds
        setTimeout(() => {
          setTypingUsers(prev => {
            const next = new Map(prev);
            next.delete(userId);
            return next;
          });
        }, 5000);
      }
    };

    const handleTypingStop = ({ conversationId: convId, userId }: { conversationId: number; userId: number }) => {
      if (convId === conversationId) {
        setTypingUsers(prev => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
      }
    };

    if (!socket) return;

    socket.on("typing:user-started", handleTypingStart);
    socket.on("typing:user-stopped", handleTypingStop);

    return () => {
      socket.off("typing:user-started", handleTypingStart);
      socket.off("typing:user-stopped", handleTypingStop);
    };
  }, [socket, conversationId, currentUserId]);

  // Send typing start event
  const startTyping = useCallback(() => {
    if (!socket) return;
    
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing:start", {
        conversationId,
        userId: currentUserId,
        userName: currentUserName,
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [socket, conversationId, currentUserId, currentUserName]);

  // Send typing stop event
  const stopTyping = useCallback(() => {
    if (!socket) return;
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit("typing:stop", {
        conversationId,
        userId: currentUserId,
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [socket, conversationId, currentUserId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  return {
    typingUsers: Array.from(typingUsers.values()),
    startTyping,
    stopTyping,
  };
}
