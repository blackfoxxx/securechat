import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function SetupUsername() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [debouncedUsername, setDebouncedUsername] = useState("");

  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Username set successfully!");
      setLocation("/chats");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Redirect if user already has username
  useEffect(() => {
    if (user?.username) {
      setLocation("/chats");
    }
  }, [user, setLocation]);

  // Debounce username input
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedUsername(username);
    }, 500);

    return () => clearTimeout(timeout);
  }, [username]);

  // Check username availability
  const { data: availabilityData, isLoading: isChecking } = trpc.user.checkUsername.useQuery(
    { username: debouncedUsername },
    { enabled: debouncedUsername.length >= 3 }
  );

  const isAvailable = debouncedUsername.length >= 3 ? availabilityData?.available : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (username.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }

    if (!isAvailable) {
      toast.error("Username is not available");
      return;
    }

    updateProfileMutation.mutate({ username });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Choose Your Username</CardTitle>
          <CardDescription>
            This is how other users will find and add you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="Enter username"
                  className="pr-10"
                  maxLength={50}
                  required
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {isChecking ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  ) : isAvailable === true ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : isAvailable === false ? (
                    <X className="h-4 w-4 text-red-500" />
                  ) : null}
                </div>
              </div>
              
              {/* Username validation messages */}
              {username.length > 0 && username.length < 3 && (
                <p className="text-sm text-yellow-600">
                  Username must be at least 3 characters
                </p>
              )}
              {username.length >= 3 && isAvailable === true && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Username is available!
                </p>
              )}
              {username.length >= 3 && isAvailable === false && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  Username is already taken
                </p>
              )}
              
              <p className="text-xs text-muted-foreground">
                Only lowercase letters, numbers, and underscores allowed
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm">Username Tips:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Choose something memorable and easy to share</li>
                <li>• You can change it later in your profile settings</li>
                <li>• Others will use this to add you as a contact</li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                !username ||
                username.length < 3 ||
                isChecking ||
                isAvailable !== true ||
                updateProfileMutation.isPending
              }
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
