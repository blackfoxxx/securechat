import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { User } from "lucide-react";

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageContent: string;
  messageId: number;
}

export function ForwardMessageDialog({
  open,
  onOpenChange,
  messageContent,
}: ForwardMessageDialogProps) {
  const [selectedConversations, setSelectedConversations] = useState<number[]>([]);

  const { data: conversations } = trpc.chat.conversations.useQuery();
  const sendMessageMutation = trpc.chat.sendMessage.useMutation();

  const handleForward = async () => {
    if (selectedConversations.length === 0) {
      toast.error("Please select at least one conversation");
      return;
    }

    try {
      // Forward to each selected conversation
      for (const conversationId of selectedConversations) {
        await sendMessageMutation.mutateAsync({
          conversationId,
          content: messageContent,
        });
      }

      toast.success(`Message forwarded to ${selectedConversations.length} conversation(s)`);
      onOpenChange(false);
      setSelectedConversations([]);
    } catch (error) {
      toast.error("Failed to forward message");
    }
  };

  const toggleConversation = (conversationId: number) => {
    setSelectedConversations((prev) =>
      prev.includes(conversationId)
        ? prev.filter((id) => id !== conversationId)
        : [...prev, conversationId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Forward Message</DialogTitle>
          <DialogDescription>
            Select conversations to forward this message to
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {conversations && conversations.length > 0 ? (
              conversations.map((conv: any) => (
                <div
                  key={conv.conversation.id}
                  className="flex items-center space-x-3 p-2 rounded hover:bg-accent cursor-pointer"
                  onClick={() => toggleConversation(conv.conversation.id)}
                >
                  <Checkbox
                    checked={selectedConversations.includes(conv.conversation.id)}
                    onCheckedChange={() => toggleConversation(conv.conversation.id)}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={conv.otherUser?.avatar || undefined} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {conv.conversation.name || conv.otherUser?.name || "Unknown"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                No conversations available
              </p>
            )}
          </div>

          <div className="bg-muted p-3 rounded text-sm">
            <p className="text-muted-foreground mb-1">Message preview:</p>
            <p className="line-clamp-2">{messageContent}</p>
          </div>

          <p className="text-xs text-muted-foreground">
            {selectedConversations.length} conversation(s) selected
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleForward} disabled={sendMessageMutation.isPending}>
            {sendMessageMutation.isPending ? "Forwarding..." : "Forward"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
