import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { Loader2, Search, User, UserPlus, Ban } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import OnlineIndicator from "@/components/OnlineIndicator";

interface AddContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddContactModal({ open, onOpenChange }: AddContactModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data: searchResults, isLoading: isSearching } = trpc.user.searchByUsername.useQuery(
    { username: searchQuery },
    { enabled: searchQuery.length >= 3 }
  );

  const addContactMutation = trpc.contacts.add.useMutation({
    onSuccess: () => {
      toast.success("Contact added successfully!");
      onOpenChange(false);
      setSearchQuery("");
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add contact");
    },
  });

  const blockMutation = trpc.blocking.block.useMutation({
    onSuccess: () => {
      toast.success("User blocked successfully");
      onOpenChange(false);
      setSearchQuery("");
      setSelectedUser(null);
    },
    onError: () => {
      toast.error("Failed to block user");
    },
  });

  const handleAddContact = (userId: number) => {
    addContactMutation.mutate({ contactId: userId });
  };

  const handleBlock = (userId: number) => {
    blockMutation.mutate({ blockedUserId: userId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
          <DialogDescription>
            Search for users by their username to add them as a contact
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Username</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
                placeholder="Enter username..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="space-y-2">
            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isSearching && searchQuery.length >= 3 && searchResults && searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0">
                        <OnlineIndicator userId={user.id} size="sm" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{user.name || "Unnamed User"}</p>
                      <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                      {user.bio && (
                        <p className="text-xs text-muted-foreground truncate mt-1">{user.bio}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddContact(user.id);
                        }}
                        disabled={addContactMutation.isPending}
                      >
                        {addContactMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBlock(user.id);
                        }}
                        disabled={blockMutation.isPending}
                      >
                        {blockMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Ban className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isSearching && searchQuery.length >= 3 && searchResults && searchResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No users found with username "{searchQuery}"</p>
              </div>
            )}

            {searchQuery.length > 0 && searchQuery.length < 3 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Enter at least 3 characters to search</p>
              </div>
            )}

            {searchQuery.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Start typing to search for users</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
