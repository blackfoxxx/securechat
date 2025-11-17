import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { Smile } from "lucide-react";
import { useState } from "react";

interface MessageReactionsProps {
  messageId: number;
  reactions?: string | null;
  currentUserId: number;
  onReactionUpdate?: () => void;
}

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function MessageReactions({
  messageId,
  reactions,
  currentUserId,
  onReactionUpdate,
}: MessageReactionsProps) {
  const [open, setOpen] = useState(false);
  
  const parsedReactions: Record<string, number[]> = reactions
    ? JSON.parse(reactions)
    : {};

  const addReactionMutation = trpc.chat.addReaction.useMutation({
    onSuccess: () => {
      onReactionUpdate?.();
      setOpen(false);
    },
  });

  const removeReactionMutation = trpc.chat.removeReaction.useMutation({
    onSuccess: () => {
      onReactionUpdate?.();
    },
  });

  const handleReactionClick = (emoji: string) => {
    const userReacted = parsedReactions[emoji]?.includes(currentUserId);
    
    if (userReacted) {
      removeReactionMutation.mutate({ messageId, emoji });
    } else {
      addReactionMutation.mutate({ messageId, emoji });
    }
  };

  const hasReactions = Object.keys(parsedReactions).length > 0;

  return (
    <div className="flex items-center gap-1 mt-1">
      {/* Display existing reactions */}
      {hasReactions && (
        <div className="flex gap-1 flex-wrap">
          {Object.entries(parsedReactions).map(([emoji, userIds]) => {
            const userReacted = userIds.includes(currentUserId);
            return (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  userReacted
                    ? "bg-primary/20 border-primary"
                    : "bg-muted border-border hover:bg-muted/80"
                }`}
              >
                {emoji} {userIds.length}
              </button>
            );
          })}
        </div>
      )}

      {/* Add reaction button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Smile className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                className="text-2xl hover:scale-125 transition-transform p-1"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
