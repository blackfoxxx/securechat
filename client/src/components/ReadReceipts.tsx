import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ReadReceipt {
  userId: number;
  readAt: string;
}

interface User {
  id: number;
  name?: string;
  username: string;
  avatar?: string;
}

interface ReadReceiptsProps {
  readBy?: string; // JSON string of ReadReceipt[]
  senderId: number;
  currentUserId: number;
  users?: User[]; // All users in the conversation for group chats
  isGroupChat?: boolean;
}

export function ReadReceipts({
  readBy,
  senderId,
  currentUserId,
  users = [],
  isGroupChat = false,
}: ReadReceiptsProps) {
  // Don't show read receipts for own messages
  if (senderId === currentUserId) {
    return null;
  }

  let receipts: ReadReceipt[] = [];
  try {
    if (readBy) {
      const parsed = JSON.parse(readBy);
      // Handle both old format (array of numbers) and new format (array of objects)
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (typeof parsed[0] === 'number') {
          // Old format: just show check marks without details
          receipts = parsed.map((id: number) => ({ userId: id, readAt: new Date().toISOString() }));
        } else {
          receipts = parsed;
        }
      }
    }
  } catch (e) {
    console.error("Failed to parse readBy:", e);
  }

  // Filter out sender from read receipts
  const filteredReceipts = receipts.filter(r => r.userId !== senderId);

  if (filteredReceipts.length === 0) {
    // Message sent but not read
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Check className="h-3 w-3" />
      </div>
    );
  }

  // For 1-on-1 chats, just show double check
  if (!isGroupChat) {
    const receipt = filteredReceipts[0];
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-primary">
            <CheckCheck className="h-3 w-3" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            Read {formatDistanceToNow(new Date(receipt.readAt), { addSuffix: true })}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // For group chats, show avatars of users who read the message
  const readByUsers = filteredReceipts
    .map(receipt => {
      const user = users.find(u => u.id === receipt.userId);
      return user ? { ...user, readAt: receipt.readAt } : null;
    })
    .filter(Boolean) as (User & { readAt: string })[];

  if (readByUsers.length === 0) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Check className="h-3 w-3" />
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1">
          <CheckCheck className="h-3 w-3 text-primary" />
          <div className="flex -space-x-2">
            {readByUsers.slice(0, 3).map((user) => (
              <Avatar key={user.id} className="h-4 w-4 border border-background">
                <AvatarImage src={user.avatar} alt={user.name || user.username} />
                <AvatarFallback className="text-[8px]">
                  {(user.name || user.username).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {readByUsers.length > 3 && (
              <div className="h-4 w-4 rounded-full bg-muted border border-background flex items-center justify-center">
                <span className="text-[8px] text-muted-foreground">+{readByUsers.length - 3}</span>
              </div>
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1 max-w-xs">
          <p className="font-semibold text-xs">Read by:</p>
          {readByUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-4 text-xs">
              <span>{user.name || user.username}</span>
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(user.readAt), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
