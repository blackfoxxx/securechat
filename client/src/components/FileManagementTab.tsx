import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { HardDrive, Settings, Users, Save } from "lucide-react";

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

export default function FileManagementTab() {
  const utils = trpc.useUtils();
  
  // Fetch system settings
  const { data: settings, isLoading: settingsLoading } = trpc.admin.getSystemSettings.useQuery();
  
  // Fetch user storage stats
  const { data: userStats, isLoading: statsLoading } = trpc.admin.getUserStorageStats.useQuery();
  
  // Update system settings mutation
  const updateSettings = trpc.admin.updateSystemSettings.useMutation({
    onSuccess: () => {
      toast.success("System settings updated successfully");
      utils.admin.getSystemSettings.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });
  
  // Update user quota mutation
  const updateQuota = trpc.admin.updateUserQuota.useMutation({
    onSuccess: () => {
      toast.success("User quota updated successfully");
      utils.admin.getUserStorageStats.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update quota: ${error.message}`);
    },
  });
  
  // Local state for settings form
  const [maxFileSize, setMaxFileSize] = useState<number>(settings?.maxFileSize || 10485760);
  const [defaultQuota, setDefaultQuota] = useState<number>(settings?.defaultStorageQuota || 1073741824);
  const [allowedTypes, setAllowedTypes] = useState<string>(
    settings?.allowedFileTypes?.join(", ") || "image/*, video/*, audio/*, application/pdf"
  );
  
  // Update local state when settings load
  useState(() => {
    if (settings) {
      setMaxFileSize(settings.maxFileSize);
      setDefaultQuota(settings.defaultStorageQuota);
      setAllowedTypes(settings.allowedFileTypes.join(", "));
    }
  });
  
  const handleSaveSettings = () => {
    const allowedTypesArray = allowedTypes.split(",").map(t => t.trim()).filter(t => t);
    
    updateSettings.mutate({
      maxFileSize,
      defaultStorageQuota: defaultQuota,
      allowedFileTypes: allowedTypesArray,
    });
  };
  
  const handleUpdateUserQuota = (userId: number, newQuota: number) => {
    updateQuota.mutate({ userId, storageQuota: newQuota });
  };
  
  // Calculate total storage used
  const totalStorageUsed = userStats?.reduce((sum, user) => sum + (user.storageUsed || 0), 0) || 0;
  
  if (settingsLoading || statsLoading) {
    return <div className="p-6">Loading...</div>;
  }
  
  return (
    <div className="space-y-6">
      {/* Global Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Global File Settings</CardTitle>
          </div>
          <CardDescription>
            Configure default file upload limits and allowed file types
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxFileSize">Maximum File Size</Label>
              <div className="flex gap-2">
                <Input
                  id="maxFileSize"
                  type="number"
                  value={Math.round(maxFileSize / 1048576)} // Convert to MB
                  onChange={(e) => setMaxFileSize(parseInt(e.target.value) * 1048576)}
                  placeholder="10"
                />
                <span className="flex items-center text-sm text-muted-foreground">MB</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Current: {formatBytes(maxFileSize)}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="defaultQuota">Default Storage Quota</Label>
              <div className="flex gap-2">
                <Input
                  id="defaultQuota"
                  type="number"
                  value={Math.round(defaultQuota / 1073741824 * 10) / 10} // Convert to GB
                  onChange={(e) => setDefaultQuota(Math.round(parseFloat(e.target.value) * 1073741824))}
                  placeholder="1"
                  step="0.1"
                />
                <span className="flex items-center text-sm text-muted-foreground">GB</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Current: {formatBytes(defaultQuota)}
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="allowedTypes">Allowed File Types</Label>
            <Input
              id="allowedTypes"
              value={allowedTypes}
              onChange={(e) => setAllowedTypes(e.target.value)}
              placeholder="image/*, video/*, audio/*, application/pdf"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated MIME types or patterns (e.g., image/*, video/mp4, application/pdf)
            </p>
          </div>
          
          <Button 
            onClick={handleSaveSettings}
            disabled={updateSettings.isPending}
            className="w-full sm:w-auto"
          >
            <Save className="mr-2 h-4 w-4" />
            {updateSettings.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
      
      {/* Storage Statistics Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            <CardTitle>Storage Statistics</CardTitle>
          </div>
          <CardDescription>
            Overview of total storage usage across all users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Storage Used</span>
              <span className="font-medium">{formatBytes(totalStorageUsed)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Users</span>
              <span className="font-medium">{userStats?.length || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Average per User</span>
              <span className="font-medium">
                {formatBytes(userStats?.length ? totalStorageUsed / userStats.length : 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* User Quota Management Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>User Storage Quotas</CardTitle>
          </div>
          <CardDescription>
            Manage individual user storage limits and view usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userStats?.map((user) => {
              const quota = user.storageQuota || defaultQuota;
              const used = user.storageUsed || 0;
              const percentage = (used / quota) * 100;
              
              return (
                <div key={user.id} className="space-y-2 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{user.name || user.username || `User ${user.id}`}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatBytes(used)} / {formatBytes(quota)} ({Math.round(percentage)}%)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-20 h-8 text-sm"
                        defaultValue={Math.round(quota / 1073741824 * 10) / 10}
                        step="0.1"
                        min="0.1"
                        onBlur={(e) => {
                          const newQuota = Math.round(parseFloat(e.target.value) * 1073741824);
                          if (newQuota !== quota) {
                            handleUpdateUserQuota(user.id, newQuota);
                          }
                        }}
                      />
                      <span className="text-xs text-muted-foreground">GB</span>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  {percentage > 90 && (
                    <p className="text-xs text-destructive">
                      ⚠️ Storage quota almost full
                    </p>
                  )}
                </div>
              );
            })}
            
            {(!userStats || userStats.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                No users found
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
