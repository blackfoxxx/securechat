import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { Streamdown } from 'streamdown';
import { Link } from "wouter";

/**
 * All content in this page are only for example, replace with your own feature implementation
 * When building pages, remember your instructions in Frontend Workflow, Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  // If theme is switchable in App.tsx, we can implement theme toggling like this:
  // const { theme, toggleTheme } = useTheme();

  // Use APP_LOGO (as image src) and APP_TITLE if needed

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <img src={APP_LOGO} alt="Logo" className="h-8 w-8" />
            <h1 className="text-xl font-bold">{APP_TITLE}</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground">Welcome, {user?.name}</span>
                <Button onClick={() => logout()}>Logout</Button>
              </>
            ) : (
              <Button onClick={() => window.location.href = getLoginUrl()}>Login</Button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center">
        <div className="container max-w-4xl text-center space-y-8">
          <h2 className="text-5xl font-bold text-gray-900">Secure Chat Platform</h2>
          <p className="text-xl text-gray-600">
            End-to-end encrypted messaging with audio and video calls
          </p>
          
          {isAuthenticated ? (
            <div className="flex gap-4 justify-center">
              <Link href="/chats">
                <Button size="lg">
                  Go to Chats
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" variant="default">
                  Create Account
                </Button>
              </Link>
              <Button size="lg" variant="outline" onClick={() => window.location.href = getLoginUrl()}>
                Sign In
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="font-semibold text-lg mb-2">🔒 End-to-End Encrypted</h3>
              <p className="text-sm text-gray-600">Your messages are secured with industry-standard encryption</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="font-semibold text-lg mb-2">📞 Voice & Video Calls</h3>
              <p className="text-sm text-gray-600">Crystal clear audio and HD video calling powered by Jitsi Meet</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="font-semibold text-lg mb-2">🌍 RTL Support</h3>
              <p className="text-sm text-gray-600">Full support for Arabic and other RTL languages</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
