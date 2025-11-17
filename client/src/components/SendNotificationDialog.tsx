import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

interface SendNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: number;
  userName?: string;
}

export function SendNotificationDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: SendNotificationDialogProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const sendNotificationMutation = trpc.admin.sendNotification.useMutation({
    onSuccess: () => {
      toast.success("Notification sent successfully");
      setTitle("");
      setMessage("");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to send notification");
    },
  });

  const broadcastMutation = trpc.admin.broadcastNotification.useMutation({
    onSuccess: () => {
      toast.success("Broadcast sent to all users");
      setTitle("");
      setMessage("");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to send broadcast");
    },
  });

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (userId) {
      sendNotificationMutation.mutate({ userId, title, message });
    } else {
      broadcastMutation.mutate({ title, message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {userId ? `Send Notification to ${userName}` : "Broadcast Notification"}
          </DialogTitle>
          <DialogDescription>
            {userId
              ? "Send a notification to this specific user"
              : "Send a notification to all users"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Notification title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Notification message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sendNotificationMutation.isPending || broadcastMutation.isPending}
          >
            {sendNotificationMutation.isPending || broadcastMutation.isPending
              ? "Sending..."
              : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
