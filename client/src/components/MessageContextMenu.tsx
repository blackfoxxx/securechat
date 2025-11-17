import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Copy, Forward, Trash2 } from "lucide-react";
import { ReactNode } from "react";

interface MessageContextMenuProps {
  children: ReactNode;
  onCopy: () => void;
  onForward: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

export function MessageContextMenu({
  children,
  onCopy,
  onForward,
  onDelete,
  canDelete,
}: MessageContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onCopy}>
          <Copy className="mr-2 h-4 w-4" />
          Copy
        </ContextMenuItem>
        <ContextMenuItem onClick={onForward}>
          <Forward className="mr-2 h-4 w-4" />
          Forward
        </ContextMenuItem>
        {canDelete && (
          <ContextMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
