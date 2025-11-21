import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { MessageCircle, Search, User, Users, UserX } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import AddContactModal from "@/components/AddContactModal";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import OnlineIndicator from "@/components/OnlineIndicator";
import BlockedUsersDialog from "@/components/BlockedUsersDialog";
import { E2EESetupWizard } from "@/components/E2EESetupWizard";
import { setupE2EE } from "@/lib/e2eeSetup";
import { toast } from "sonner";
import { useEffect } from "react";
import { UserSearchAutocomplete } from "@/components/UserSearchAutocomplete";
import { useLocation } from "wouter";

export default function ChatList() {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isBlockedUsersOpen, setIsBlockedUsersOpen] = useState(false);
  const [isE2EEWizardOpen, setIsE2EEWizardOpen] = useState(false);
  
  const { data: e2eeStatus } = trpc.e2ee.isEnabled.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const setupE2EEMutation = trpc.e2ee.setup.useMutation();
  const createOrGetConversationMutation = trpc.chat.createOrGetConversation.useMutation();
  const utils = trpc.useUtils();

  // Auto-trigger E2EE wizard for new users
  useEffect(() => {
    if (e2eeStatus && !e2eeStatus.enabled) {
      // Check if user has dismissed the wizard before
      const dismissed = localStorage.getItem('e2ee-wizard-dismissed');
      if (!dismissed) {
        setIsE2EEWizardOpen(true);
      }
    }
  }, [e2eeStatus]);
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
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Chats</h1>
            <div className="flex gap-2">
              <Link href="/profile">
                <Button variant="outline">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Button>
              </Link>
              <Button onClick={() => setIsAddContactOpen(true)}>
                <MessageCircle className="mr-2 h-4 w-4" />
                New Chat
              </Button>
              <Button variant="outline" onClick={() => setIsCreateGroupOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                New Group
              </Button>
              <Button variant="outline" onClick={() => setIsBlockedUsersOpen(true)}>
                <UserX className="mr-2 h-4 w-4" />
                Blocked
              </Button>
            </div>
          </div>
          
          {/* User Search with Auto-complete */}
          <UserSearchAutocomplete
            onSelectUser={async (selectedUser) => {
              try {
                toast.loading("Starting chat...");
                const result = await createOrGetConversationMutation.mutateAsync({
                  otherUserId: selectedUser.id,
                });
                
                // Refresh conversations list
                await utils.chat.conversations.invalidate();
                
                toast.dismiss();
                if (result.isNew) {
                  toast.success(`Started new chat with ${selectedUser.name || selectedUser.username}`);
                } else {
                  toast.success(`Opening chat with ${selectedUser.name || selectedUser.username}`);
                }
                
                // Navigate to the conversation
                setLocation(`/chat/${result.conversationId}`);
              } catch (error) {
                toast.dismiss();
                console.error("Failed to create conversation:", error);
                toast.error("Failed to start chat. Please try again.");
              }
            }}
            placeholder="Search users to start chatting..."
          />
        </div>

        {conversations && conversations.length > 0 ? (
          <div className="space-y-2">
            {conversations
              .filter((conv) => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                return (
                  conv.conversation.name?.toLowerCase().includes(query) ||
                  conv.lastMessage?.content?.toLowerCase().includes(query)
                );
              })
              .map((conv, index) => (
              <Link key={`conv-${conv.conversation.id}-${index}`} href={`/chat/${conv.conversation.id}`}>
                <Card className="p-4 hover:bg-accent cursor-pointer transition-colors">
                  <div className="flex items-center gap-4">
                    {/* Avatar with online indicator */}
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={conv.otherUser?.avatar || undefined} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      {conv.otherUser?.id && (
                        <div className="absolute bottom-0 right-0">
                          <OnlineIndicator userId={conv.otherUser.id} size="sm" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {conv.conversation.name || conv.otherUser?.name || "Unnamed Conversation"}
                      </h3>
                      {conv.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessage.content}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex-shrink-0">
                      {conv.conversation.updatedAt && 
                        new Date(conv.conversation.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : searchQuery ? (
          <Card className="p-8 text-center">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground mb-4">
              No conversations found matching "{searchQuery}"
            </p>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
            <p className="text-muted-foreground mb-4">
              Start a new conversation to begin chatting
            </p>
            <Button onClick={() => setIsAddContactOpen(true)}>Start New Chat</Button>
          </Card>
        )}
      </div>
      
      <AddContactModal open={isAddContactOpen} onOpenChange={setIsAddContactOpen} />
      <CreateGroupDialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen} />
      <BlockedUsersDialog open={isBlockedUsersOpen} onOpenChange={setIsBlockedUsersOpen} />
      
      <E2EESetupWizard
        open={isE2EEWizardOpen}
        onOpenChange={(open) => {
          setIsE2EEWizardOpen(open);
          if (!open) {
            // Mark as dismissed when user closes wizard
            localStorage.setItem('e2ee-wizard-dismissed', 'true');
          }
        }}
        onComplete={async (password, recoveryCodes) => {
          try {
            const { publicKey, encryptedPrivateKey, keySalt, iv, hashedRecoveryCodes } = await setupE2EE(
              password,
              recoveryCodes
            );
            
            await setupE2EEMutation.mutateAsync({
              publicKey,
              encryptedPrivateKey,
              keySalt,
              keyIv: iv,
              recoveryCodes: hashedRecoveryCodes,
            });
            
            toast.success("E2EE setup complete! Your messages are now secure.");
          } catch (error) {
            console.error("Failed to setup E2EE:", error);
            throw error;
          }
        }}
        canSkip={true}
      />
    </div>
  );
}
