import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSocket } from "@/contexts/SocketContext";
import { trpc } from "@/lib/trpc";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";

export default function ChatRoom() {
  const { id } = useParams<{ id: string }>();
  const conversationId = parseInt(id || "0");
  const { user, isAuthenticated } = useAuth();
  const { socket, connected } = useSocket();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, refetch } = trpc.chat.messages.useQuery(
    { conversationId },
    { enabled: isAuthenticated && conversationId > 0 }
  );

  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      refetch();
      setMessage("");
    },
  });

  useEffect(() => {
    if (socket && connected) {
      socket.emit("join-conversation", conversationId);

      socket.on("new-message", () => {
        refetch();
      });

      return () => {
        socket.off("new-message");
        socket.emit("leave-conversation", conversationId);
      };
    }
  }, [socket, connected, conversationId, refetch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (message.trim() && user) {
      sendMessageMutation.mutate({
        conversationId,
        content: message,
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-4">Please log in</h2>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b p-4">
        <h2 className="text-xl font-semibold">Chat Room</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages && messages.length > 0 ? (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
            >
              <Card
                className={`p-3 max-w-[70%] ${
                  msg.senderId === user?.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </p>
              </Card>
            </div>
          ))
        ) : (
          <div className="text-center text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
