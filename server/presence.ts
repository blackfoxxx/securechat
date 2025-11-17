import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";

// Track online users (userId -> Set of socket IDs)
const onlineUsers = new Map<number, Set<string>>();

export function setupPresence(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Handle user coming online
    socket.on("user:online", ({ userId }: { userId: number }) => {
      if (!userId) return;

      // Add socket to user's socket set
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId)!.add(socket.id);

      console.log(`User ${userId} is online (socket: ${socket.id})`);

      // Broadcast to all clients that this user is online
      io.emit("presence:user-online", userId);

      // Send current online users list to the newly connected user
      const onlineUserIds = Array.from(onlineUsers.keys());
      socket.emit("presence:online-users", onlineUserIds);
    });

    // Handle user going offline
    socket.on("user:offline", ({ userId }: { userId: number }) => {
      handleUserOffline(userId, socket.id, io);
    });

    // Handle typing events
    socket.on("typing:start", ({ conversationId, userId, userName }: { conversationId: number; userId: number; userName: string }) => {
      console.log(`User ${userId} started typing in conversation ${conversationId}`);
      // Broadcast to all users in the conversation except sender
      socket.broadcast.emit("typing:user-started", { conversationId, userId, userName });
    });

    socket.on("typing:stop", ({ conversationId, userId }: { conversationId: number; userId: number }) => {
      console.log(`User ${userId} stopped typing in conversation ${conversationId}`);
      // Broadcast to all users in the conversation except sender
      socket.broadcast.emit("typing:user-stopped", { conversationId, userId });
    });

    // Handle message read
    socket.on("message:read", async ({ messageId, userId }: { messageId: number; userId: number }) => {
      try {
        const { markMessageAsRead } = await import("./db");
        await markMessageAsRead(messageId, userId);
        
        // Broadcast to all users
        io.emit("message:read:update", { messageId, userId });
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    });

    // Handle call initiation (supports both 1-on-1 and group calls)
    socket.on("call:initiate", ({ 
      callerId, 
      callerName, 
      callerAvatar,
      recipientIds, // Array of recipient user IDs for group calls
      conversationId, 
      roomName,
      callType,
      isGroupCall 
    }: { 
      callerId: number; 
      callerName: string;
      callerAvatar?: string;
      recipientIds: number[]; // Changed from recipientId to recipientIds array
      conversationId: number; 
      roomName: string;
      callType: "video" | "audio";
      isGroupCall: boolean;
    }) => {
      console.log(`Call initiated: ${callerName} (${callerId}) calling ${recipientIds.length} user(s)`);
      
      const offlineRecipients: number[] = [];
      
      // Send call notification to all recipients
      recipientIds.forEach(recipientId => {
        const recipientSockets = onlineUsers.get(recipientId);
        if (recipientSockets) {
          recipientSockets.forEach(socketId => {
            io.to(socketId).emit("call:incoming", {
              callerId,
              callerName,
              callerAvatar,
              conversationId,
              roomName,
              callType,
              isGroupCall,
            });
          });
        } else {
          offlineRecipients.push(recipientId);
        }
      });
      
      // Notify caller about offline recipients
      if (offlineRecipients.length > 0) {
        socket.emit("call:some-recipients-offline", { offlineRecipients });
      }
    });

    // Handle call acceptance
    socket.on("call:accept", ({ 
      callerId, 
      recipientId,
      recipientName,
      conversationId, 
      roomName 
    }: { 
      callerId: number; 
      recipientId: number;
      recipientName: string;
      conversationId: number; 
      roomName: string;
    }) => {
      console.log(`Call accepted: User ${recipientId} accepted call from ${callerId}`);
      
      // Notify caller that call was accepted
      const callerSockets = onlineUsers.get(callerId);
      if (callerSockets) {
        callerSockets.forEach(socketId => {
          io.to(socketId).emit("call:accepted", {
            recipientId,
            recipientName,
            conversationId,
            roomName,
          });
        });
      }
    });

    // Handle call decline
    socket.on("call:decline", ({ 
      callerId, 
      recipientId,
      recipientName 
    }: { 
      callerId: number; 
      recipientId: number;
      recipientName: string;
    }) => {
      console.log(`Call declined: User ${recipientId} declined call from ${callerId}`);
      
      // Notify caller that call was declined
      const callerSockets = onlineUsers.get(callerId);
      if (callerSockets) {
        callerSockets.forEach(socketId => {
          io.to(socketId).emit("call:declined", {
            recipientId,
            recipientName,
          });
        });
      }
    });

    // Handle call cancellation
    socket.on("call:cancel", ({ 
      callerId,
      recipientId 
    }: { 
      callerId: number;
      recipientId: number;
    }) => {
      console.log(`Call cancelled: User ${callerId} cancelled call to ${recipientId}`);
      
      // Notify recipient that call was cancelled
      const recipientSockets = onlineUsers.get(recipientId);
      if (recipientSockets) {
        recipientSockets.forEach(socketId => {
          io.to(socketId).emit("call:cancelled", { callerId });
        });
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      // Find and remove this socket from online users
      for (const [userId, socketIds] of Array.from(onlineUsers.entries())) {
        if (socketIds.has(socket.id)) {
          handleUserOffline(userId, socket.id, io);
          break;
        }
      }
    });
  });

  return io;
}

function handleUserOffline(userId: number, socketId: string, io: SocketIOServer) {
  if (!onlineUsers.has(userId)) return;

  const userSockets = onlineUsers.get(userId)!;
  userSockets.delete(socketId);

  // If user has no more active sockets, mark them as offline
  if (userSockets.size === 0) {
    onlineUsers.delete(userId);
    console.log(`User ${userId} is offline`);
    io.emit("presence:user-offline", userId);
  }
}
