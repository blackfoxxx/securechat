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
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Loader2, Search, Upload, User, Users, X } from "lucide-react";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"details" | "members">("details");
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string>("");
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const utils = trpc.useUtils();

  // Search users for adding to group
  const { data: searchResults, isLoading: isSearching } = trpc.user.searchUsers.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );
  
  const createGroupMutation = trpc.chat.createGroup.useMutation({
    onSuccess: (data) => {
      toast.success("Group created successfully!");
      utils.chat.conversations.invalidate();
      onOpenChange(false);
      resetForm();
      // Navigate to the new group chat
      if (data.conversationId) {
        setLocation(`/chat/${data.conversationId}`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to create group: ${error.message}`);
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Avatar must be less than 5MB");
        return;
      }
      setGroupAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setGroupAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleMember = (userId: number) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleNext = () => {
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    setStep("members");
  };

  const handleCreate = async () => {
    if (selectedMembers.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    let avatarUrl = "";
    if (groupAvatar) {
      // Upload avatar to S3
      const formData = new FormData();
      formData.append("file", groupAvatar);
      
      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        avatarUrl = data.url;
      } catch (error) {
        console.error("Failed to upload avatar:", error);
        toast.error("Failed to upload group avatar");
        return;
      }
    }

    createGroupMutation.mutate({
      name: groupName,
      memberIds: selectedMembers,
    });
  };

  const resetForm = () => {
    setStep("details");
    setGroupName("");
    setGroupDescription("");
    setGroupAvatar(null);
    setGroupAvatarPreview("");
    setSelectedMembers([]);
    setSearchQuery("");
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {step === "details" ? "Create New Group" : "Add Members"}
          </DialogTitle>
          <DialogDescription>
            {step === "details"
              ? "Enter group details and customize your group"
              : `Select members to add to "${groupName}"`}
          </DialogDescription>
        </DialogHeader>

        {step === "details" ? (
          <div className="space-y-4 py-4">
            {/* Group Avatar */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                {groupAvatarPreview ? (
                  <AvatarImage src={groupAvatarPreview} />
                ) : (
                  <AvatarFallback>
                    <Users className="h-12 w-12" />
                  </AvatarFallback>
                )}
              </Avatar>
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Upload className="h-4 w-4" />
                  Upload Group Photo
                </div>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </Label>
            </div>

            {/* Group Name */}
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name *</Label>
              <Input
                id="group-name"
                placeholder="Enter group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Group Description */}
            <div className="space-y-2">
              <Label htmlFor="group-description">Description (Optional)</Label>
              <Textarea
                id="group-description"
                placeholder="What's this group about?"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {groupDescription.length}/500 characters
              </p>
            </div>
          </div>
        ) : (
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

            {/* Selected Members */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map((userId) => {
                  const user = searchResults?.find((u) => u.id === userId);
                  return (
                    <div
                      key={userId}
                      className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm"
                    >
                      <span>{user?.name || user?.username}</span>
                      <button
                        onClick={() => toggleMember(userId)}
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
              ) : searchResults && searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent cursor-pointer"
                      onClick={() => toggleMember(user.id)}
                    >
                      <Checkbox
                        checked={selectedMembers.includes(user.id)}
                        onCheckedChange={() => toggleMember(user.id)}
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
                  <p className="text-sm text-muted-foreground">No users found</p>
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          {step === "details" ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleNext}>
                Next
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("details")}>
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createGroupMutation.isPending || selectedMembers.length === 0}
              >
                {createGroupMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Group
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
