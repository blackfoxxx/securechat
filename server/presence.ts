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
