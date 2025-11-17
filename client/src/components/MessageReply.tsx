import { X } from "lucide-react";
import { Button } from "./ui/button";

interface MessageReplyProps {
  replyTo: {
    id: number;
    content: string;
    senderName: string;
  } | null;
  onCancel: () => void;
}

export function MessageReply({ replyTo, onCancel }: MessageReplyProps) {
  if (!replyTo) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted border-l-4 border-primary">
      <div className="flex-1">
        <div className="text-sm font-semibold text-primary">{replyTo.senderName}</div>
        <div className="text-sm text-muted-foreground truncate">{replyTo.content}</div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onCancel}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
