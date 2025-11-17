import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { Loader2, User, UserX } from "lucide-react";
import { toast } from "sonner";

interface BlockedUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BlockedUsersDialog({ open, onOpenChange }: BlockedUsersDialogProps) {
  const { data: blockedUsers, isLoading, refetch } = trpc.blocking.list.useQuery(undefined, {
    enabled: open,
  });

  const unblockMutation = trpc.blocking.unblock.useMutation({
    onSuccess: () => {
      toast.success("User unblocked successfully");
      refetch();
    },
    onError: () => {
      toast.error("Failed to unblock user");
    },
  });

  const handleUnblock = (blockedUserId: number) => {
    unblockMutation.mutate({ blockedUserId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Blocked Users</DialogTitle>
          <DialogDescription>
            Manage users you have blocked
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && blockedUsers && blockedUsers.length > 0 && (
            <div className="space-y-2">
              {blockedUsers.map((blocked: any) => (
                <div
                  key={blocked.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <Avatar>
                    <AvatarImage src={blocked.blockedUserAvatar} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {blocked.blockedUserName || "Unnamed User"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      @{blocked.blockedUserUsername}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUnblock(blocked.blockedUserId)}
                    disabled={unblockMutation.isPending}
                  >
                    {unblockMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserX className="h-4 w-4 mr-1" />
                        Unblock
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {!isLoading && blockedUsers && blockedUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <UserX className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No blocked users</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
