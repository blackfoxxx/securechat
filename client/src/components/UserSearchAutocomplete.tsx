import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Search, Loader2, MessageCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UserSearchAutocompleteProps {
  onSelectUser: (user: { id: number; username: string | null; name: string | null; avatar: string | null }) => void;
  placeholder?: string;
  className?: string;
}

export function UserSearchAutocomplete({ 
  onSelectUser, 
  placeholder = "Search users by name or username...",
  className 
}: UserSearchAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: searchResults, isLoading } = trpc.user.searchUsers.useQuery(
    { query, limit: 10 },
    { 
      enabled: query.length >= 2,
    }
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Show/hide dropdown based on query and results
  useEffect(() => {
    if (query.length >= 2 && searchResults && searchResults.length > 0) {
      setIsOpen(true);
    } else if (query.length < 2) {
      setIsOpen(false);
    }
  }, [query, searchResults]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || !searchResults || searchResults.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleSelectUser(searchResults[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelectUser = (user: { id: number; username: string | null; name: string | null; avatar: string | null; bio: string | null }) => {
    onSelectUser(user);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const getInitials = (name: string | null, username: string | null) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (username) {
      return username.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.length >= 2 && searchResults && searchResults.length > 0) {
              setIsOpen(true);
            }
          }}
          className="pl-10 pr-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && searchResults && searchResults.length > 0 && (
        <Card className="absolute z-50 w-full mt-2 max-h-96 overflow-y-auto shadow-lg">
          <div className="p-2">
            {searchResults.map((user, index) => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                  selectedIndex === index
                    ? "bg-accent"
                    : "hover:bg-accent/50"
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback>
                    {getInitials(user.name, user.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {user.name || user.username || "Unknown User"}
                  </p>
                  {user.username && (
                    <p className="text-sm text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  )}
                  {user.bio && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {user.bio}
                    </p>
                  )}
                </div>
                <MessageCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* No Results */}
      {isOpen && query.length >= 2 && searchResults && searchResults.length === 0 && !isLoading && (
        <Card className="absolute z-50 w-full mt-2 shadow-lg">
          <div className="p-4 text-center text-sm text-muted-foreground">
            No users found matching "{query}"
          </div>
        </Card>
      )}

      {/* Search Hint */}
      {query.length > 0 && query.length < 2 && (
        <Card className="absolute z-50 w-full mt-2 shadow-lg">
          <div className="p-4 text-center text-sm text-muted-foreground">
            Type at least 2 characters to search
          </div>
        </Card>
      )}
    </div>
  );
}
