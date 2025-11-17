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
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const [, setLocation] = useLocation();
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  const { data: contacts } = trpc.contacts.list.useQuery();
  
  const createGroupMutation = trpc.chat.createGroup.useMutation({
    onSuccess: (data) => {
      toast.success("Group created successfully!");
      onOpenChange(false);
      setGroupName("");
      setSelectedMembers([]);
      // Navigate to the new group chat
      if (data.conversationId) {
        setLocation(`/chat/${data.conversationId}`);
      }
    },
    onError: () => {
      toast.error("Failed to create group");
    },
  });

  const handleCreate = () => {
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    if (selectedMembers.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    createGroupMutation.mutate({
      name: groupName,
      memberIds: selectedMembers,
    });
  };

  const toggleMember = (userId: number) => {
    setSelectedMembers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            Create a group chat with multiple contacts
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Select Members</Label>
            <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-md p-3">
              {contacts && contacts.length > 0 ? (
                contacts.map((contact: any) => (
                  <div key={contact.contactUser.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`contact-${contact.contactUser.id}`}
                      checked={selectedMembers.includes(contact.contactUser.id)}
                      onCheckedChange={() => toggleMember(contact.contactUser.id)}
                    />
                    <label
                      htmlFor={`contact-${contact.contactUser.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {contact.contactUser.name || contact.contactUser.username || "Unknown"}
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No contacts available</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedMembers.length} member(s) selected
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={createGroupMutation.isPending}>
            {createGroupMutation.isPending ? "Creating..." : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
