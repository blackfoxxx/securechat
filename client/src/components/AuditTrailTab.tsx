import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  LogIn, 
  LogOut, 
  UserPlus, 
  MessageSquare, 
  Trash2, 
  Upload, 
  UserCheck, 
  Shield, 
  Users, 
  User,
  Settings,
  Key,
  Filter,
  X
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

interface AuditTrailTabProps {
  filters: {
    userId?: number;
    activityType?: string;
    startDate?: string;
    endDate?: string;
  };
  onFiltersChange: (filters: any) => void;
}

const activityTypeIcons: Record<string, any> = {
  login: LogIn,
  logout: LogOut,
  register: UserPlus,
  message_sent: MessageSquare,
  message_deleted: Trash2,
  file_uploaded: Upload,
  contact_added: UserCheck,
  contact_blocked: Shield,
  contact_unblocked: Shield,
  group_created: Users,
  group_joined: Users,
  group_left: Users,
  profile_updated: User,
  password_changed: Key,
};

const activityTypeColors: Record<string, string> = {
  login: "default",
  logout: "secondary",
  register: "default",
  message_sent: "default",
  message_deleted: "destructive",
  file_uploaded: "default",
  contact_added: "default",
  contact_blocked: "destructive",
  contact_unblocked: "default",
  group_created: "default",
  group_joined: "default",
  group_left: "secondary",
  profile_updated: "default",
  password_changed: "destructive",
};

export default function AuditTrailTab({ filters, onFiltersChange }: AuditTrailTabProps) {
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data, isLoading, refetch } = trpc.admin.getActivityLogs.useQuery({
    userId: filters.userId,
    activityType: filters.activityType,
    startDate: filters.startDate,
    endDate: filters.endDate,
    limit,
    offset: page * limit,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    try {
      return format(new Date(date), "MMM d, yyyy HH:mm:ss");
    } catch {
      return "Invalid date";
    }
  };

  const formatActivityType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const parseDetails = (details: string | null) => {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return null;
    }
  };

  const clearFilters = () => {
    onFiltersChange({
      userId: undefined,
      activityType: undefined,
      startDate: undefined,
      endDate: undefined,
    });
    setPage(0);
  };

  const hasActiveFilters = filters.userId || filters.activityType || filters.startDate || filters.endDate;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Logs</CardTitle>
            <CardDescription>
              Track user activities and system events
            </CardDescription>
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Activity Type</label>
            <Select
              value={filters.activityType || "all"}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  activityType: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="register">Register</SelectItem>
                <SelectItem value="message_sent">Message Sent</SelectItem>
                <SelectItem value="message_deleted">Message Deleted</SelectItem>
                <SelectItem value="file_uploaded">File Uploaded</SelectItem>
                <SelectItem value="contact_added">Contact Added</SelectItem>
                <SelectItem value="contact_blocked">Contact Blocked</SelectItem>
                <SelectItem value="profile_updated">Profile Updated</SelectItem>
                <SelectItem value="password_changed">Password Changed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Start Date</label>
            <Input
              type="date"
              value={filters.startDate || ""}
              onChange={(e) =>
                onFiltersChange({ ...filters, startDate: e.target.value || undefined })
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">End Date</label>
            <Input
              type="date"
              value={filters.endDate || ""}
              onChange={(e) =>
                onFiltersChange({ ...filters, endDate: e.target.value || undefined })
              }
            />
          </div>

          <div className="flex items-end">
            <Button onClick={() => refetch()} variant="outline" className="w-full">
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading activity logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activity logs found
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const Icon = activityTypeIcons[log.activityType] || Settings;
                  const details = parseDetails(log.details);

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.userName || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">
                            {log.userEmail || `ID: ${log.userId}`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={activityTypeColors[log.activityType] as any || "default"}
                          className="flex items-center gap-1 w-fit"
                        >
                          <Icon className="h-3 w-3" />
                          {formatActivityType(log.activityType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {details ? (
                          <div className="text-muted-foreground">
                            {Object.entries(details)
                              .slice(0, 2)
                              .map(([key, value]) => (
                                <div key={key}>
                                  {key}: {String(value)}
                                </div>
                              ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.ipAddress || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} logs
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
