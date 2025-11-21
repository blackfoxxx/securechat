import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Search, User, UserMinus, UserPlus, X, LogOut } from "lucide-react";

interface GroupSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: number;
  groupName: string;
  members: Array<{ id: number; name: string; username: string; avatar: string | null }>;
  currentUserId: number;
}

export function GroupSettingsDialog({
  open,
  onOpenChange,
  conversationId,
  groupName,
  members,
  currentUserId,
}: GroupSettingsDialogProps) {
  const [view, setView] = useState<"info" | "add" | "remove">("info");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [memberToRemove, setMemberToRemove] = useState<number | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const utils = trpc.useUtils();

  // Search users for adding to group
  const { data: searchResults, isLoading: isSearching } = trpc.user.searchUsers.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 && view === "add" }
  );

  // Filter out existing members from search results
  const availableUsers = searchResults?.filter(
    (user) => !members.some((member) => member.id === user.id)
  );

  // Add members mutation
  const addMembersMutation = trpc.chat.addGroupMembers.useMutation({
    onSuccess: () => {
      toast.success("Members added successfully!");
      utils.chat.conversations.invalidate();
      setView("info");
      setSelectedUsers([]);
      setSearchQuery("");
    },
    onError: (error) => {
      toast.error(`Failed to add members: ${error.message}`);
    },
  });

  // Remove member mutation
  const removeMemberMutation = trpc.chat.removeGroupMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed successfully!");
      utils.chat.conversations.invalidate();
      setMemberToRemove(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to remove member: ${error.message}`);
    },
  });

  // Leave group mutation
  const leaveGroupMutation = trpc.chat.leaveGroup.useMutation({
    onSuccess: () => {
      toast.success("You left the group");
      utils.chat.conversations.invalidate();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to leave group: ${error.message}`);
    },
  });

  const toggleUser = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAddMembers = () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user");
      return;
    }

    addMembersMutation.mutate({
      conversationId,
      userIds: selectedUsers,
    });
  };

  const handleRemoveMember = (userId: number) => {
    setMemberToRemove(userId);
  };

  const confirmRemoveMember = () => {
    if (memberToRemove) {
      removeMemberMutation.mutate({
        conversationId,
        userId: memberToRemove,
      });
    }
  };

  const handleLeaveGroup = () => {
    setShowLeaveConfirm(true);
  };

  const confirmLeaveGroup = () => {
    leaveGroupMutation.mutate({ conversationId });
  };

  const handleClose = () => {
    onOpenChange(false);
    setView("info");
    setSearchQuery("");
    setSelectedUsers([]);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {view === "info" && "Group Settings"}
              {view === "add" && "Add Members"}
              {view === "remove" && "Remove Members"}
            </DialogTitle>
            <DialogDescription>
              {view === "info" && `Manage "${groupName}"`}
              {view === "add" && "Search and add new members to the group"}
              {view === "remove" && "Select members to remove from the group"}
            </DialogDescription>
          </DialogHeader>

          {view === "info" && (
            <div className="space-y-4 py-4">
              {/* Group Info */}
              <div className="space-y-2">
                <Label>Group Name</Label>
                <p className="text-sm font-medium">{groupName}</p>
              </div>

              <div className="space-y-2">
                <Label>Members ({members.length})</Label>
                <ScrollArea className="h-[200px] rounded-md border p-4">
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 rounded-lg p-2">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar || undefined} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{member.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            @{member.username}
                          </p>
                        </div>
                        {member.id === currentUserId && (
                          <span className="text-xs text-muted-foreground">(You)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setView("add")}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Members
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setView("remove")}
                >
                  <UserMinus className="mr-2 h-4 w-4" />
                  Remove Members
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={handleLeaveGroup}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Leave Group
                </Button>
              </div>
            </div>
          )}

          {view === "add" && (
            <div className="space-y-4 py-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((userId) => {
                    const user = availableUsers?.find((u) => u.id === userId);
                    return (
                      <div
                        key={userId}
                        className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm"
                      >
                        <span>{user?.name || user?.username}</span>
                        <button
                          onClick={() => toggleUser(userId)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* User List */}
              <ScrollArea className="h-[300px] rounded-md border p-4">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : searchQuery.length < 2 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Search className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Type at least 2 characters to search
                    </p>
                  </div>
                ) : availableUsers && availableUsers.length > 0 ? (
                  <div className="space-y-2">
                    {availableUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent cursor-pointer"
                        onClick={() => toggleUser(user.id)}
                      >
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => toggleUser(user.id)}
                        />
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar || undefined} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            @{user.username}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <User className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery.length >= 2 ? "No users found" : "All users are already members"}
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {view === "remove" && (
            <div className="space-y-4 py-4">
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-2">
                  {members
                    .filter((member) => member.id !== currentUserId)
                    .map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar || undefined} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{member.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            @{member.username}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <DialogFooter>
            {view === "info" ? (
              <Button onClick={handleClose}>Close</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setView("info")}>
                  Back
                </Button>
                {view === "add" && (
                  <Button
                    onClick={handleAddMembers}
                    disabled={addMembersMutation.isPending || selectedUsers.length === 0}
                  >
                    {addMembersMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Members
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={memberToRemove !== null} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the group? They will no longer have
              access to the conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Group Confirmation */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave "{groupName}"? You will no longer receive messages from
              this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLeaveGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {leaveGroupMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Leave Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
