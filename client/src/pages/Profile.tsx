import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, User, Bell, Lock } from "lucide-react";
import { useState } from "react";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { TwoFactorAuthDialog } from "@/components/TwoFactorAuthDialog";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || "",
    name: user?.name || "",
    bio: user?.bio || "",
    avatar: user?.avatar || "",
  });

  const [notifications, setNotifications] = useState({
    messageNotifications: true,
    callNotifications: true,
    groupNotifications: true,
    soundEnabled: true,
  });

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);

  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateNotificationsMutation = trpc.user.updateNotifications.useMutation({
    onSuccess: () => {
      toast.success("Notification preferences updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    const newNotifications = { ...notifications, [key]: value };
    setNotifications(newNotifications);
    updateNotificationsMutation.mutate(newNotifications);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Not Logged In</CardTitle>
            <CardDescription>Please log in to view your profile</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Link href="/chats">
              <Button variant="ghost">← Back to Chats</Button>
            </Link>
            <h1 className="text-2xl font-bold">Profile Settings</h1>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl py-8 space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information and avatar</CardDescription>
              </div>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={formData.avatar} />
                  <AvatarFallback>
                    <User className="h-12 w-12" />
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <div className="flex-1">
                    <Label htmlFor="avatar">Avatar URL</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="avatar"
                        value={formData.avatar}
                        onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                        placeholder="https://example.com/avatar.jpg"
                      />
                      <Button type="button" variant="outline">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter unique username"
                  disabled={!isEditing}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Your username is used to identify you. Others can add you using this username.
                </p>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your display name"
                  disabled={!isEditing}
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell others about yourself..."
                  disabled={!isEditing}
                  rows={3}
                />
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user.email || "Not set"}
                  disabled
                  className="bg-gray-100"
                />
              </div>

              {isEditing && (
                <div className="flex gap-2">
                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        username: user?.username || "",
                        name: user?.name || "",
                        bio: user?.bio || "",
                        avatar: user?.avatar || "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>Manage how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="messageNotifications">Message Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications for new messages
                </p>
              </div>
              <Switch
                id="messageNotifications"
                checked={notifications.messageNotifications}
                onCheckedChange={(checked) =>
                  handleNotificationChange("messageNotifications", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="callNotifications">Call Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications for incoming calls
                </p>
              </div>
              <Switch
                id="callNotifications"
                checked={notifications.callNotifications}
                onCheckedChange={(checked) =>
                  handleNotificationChange("callNotifications", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="groupNotifications">Group Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications for group messages
                </p>
              </div>
              <Switch
                id="groupNotifications"
                checked={notifications.groupNotifications}
                onCheckedChange={(checked) =>
                  handleNotificationChange("groupNotifications", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="soundEnabled">Sound Enabled</Label>
                <p className="text-sm text-muted-foreground">
                  Play sound for notifications
                </p>
              </div>
              <Switch
                id="soundEnabled"
                checked={notifications.soundEnabled}
                onCheckedChange={(checked) => handleNotificationChange("soundEnabled", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Manage your account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              onClick={() => setShowChangePassword(true)}
              className="w-full justify-start"
            >
              Change Password
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShow2FADialog(true)}
              className="w-full justify-start"
            >
              Two-Factor Authentication
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <ChangePasswordDialog 
        open={showChangePassword} 
        onOpenChange={setShowChangePassword} 
      />
      <TwoFactorAuthDialog 
        open={show2FADialog} 
        onOpenChange={setShow2FADialog} 
      />
    </div>
  );
}
