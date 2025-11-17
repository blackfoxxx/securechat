import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { MessageCircle } from "lucide-react";
import { Link } from "wouter";

export default function ChatList() {
  const { user, isAuthenticated } = useAuth();
  const { data: conversations, isLoading } = trpc.chat.conversations.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-4">Please log in</h2>
          <p className="text-muted-foreground mb-4">You need to be logged in to view your chats.</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading conversations...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Chats</h1>
          <Button>
            <MessageCircle className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>

        {conversations && conversations.length > 0 ? (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <Link key={conv.conversation.id} href={`/chat/${conv.conversation.id}`}>
                <Card className="p-4 hover:bg-accent cursor-pointer transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold">
                        {conv.conversation.name || "Unnamed Conversation"}
                      </h3>
                      {conv.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessage.content}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {conv.conversation.updatedAt && 
                        new Date(conv.conversation.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
            <p className="text-muted-foreground mb-4">
              Start a new conversation to begin chatting
            </p>
            <Button>Start New Chat</Button>
          </Card>
        )}
      </div>
    </div>
  );
}
