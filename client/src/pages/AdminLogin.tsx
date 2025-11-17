import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const loginMutation = trpc.admin.login.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Admin login successful");
        // Store admin session
        sessionStorage.setItem("adminAuthenticated", "true");
        setLocation("/admin");
      } else {
        toast.error("Invalid credentials");
      }
    },
    onError: () => {
      toast.error("Login failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Please enter both username and password");
      return;
    }
    loginMutation.mutate({ username, password });
  };

  // If user is already logged in as admin, redirect
  if (user?.role === "admin" && sessionStorage.getItem("adminAuthenticated")) {
    setLocation("/admin");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="text-muted-foreground mt-2">
            Enter your admin credentials to access the dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter admin username"
              autoComplete="username"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Logging in..." : "Login"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>Default credentials:</p>
          <p>Username: admin | Password: admin123</p>
        </div>
      </Card>
    </div>
  );
}
