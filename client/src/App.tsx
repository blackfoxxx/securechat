import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SocketProvider, useSocket } from "./contexts/SocketContext";
import { IncomingCallModal } from "./components/IncomingCallModal";
import { useLocation } from "wouter";
import { useAuth } from "./_core/hooks/useAuth";
import { LanguageProvider } from "./contexts/LanguageContext";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import ChatList from "./pages/ChatList";
import ChatRoom from "./pages/ChatRoom";
import VideoCall from "./pages/VideoCall";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import SetupUsername from "./pages/SetupUsername";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/register" component={Register} />
      <Route path="/setup-username" component={SetupUsername} />
      <Route path="/chats" component={ChatList} />
      <Route path="/profile" component={Profile} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path={"/chat/:id"} component={ChatRoom} />
      <Route path={"/call/:id"} component={VideoCall} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function AppContent() {
  const { socket, incomingCall, clearIncomingCall } = useSocket();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const handleAcceptCall = () => {
    if (!incomingCall || !socket || !user) return;

    // Send accept event to caller
    socket.emit("call:accept", {
      callerId: incomingCall.callerId,
      recipientId: user.id,
      recipientName: user.name || user.username || "User",
      conversationId: incomingCall.conversationId,
      roomName: incomingCall.roomName,
    });

    // Navigate to call page
    const displayName = user.name || user.username || "User";
    setLocation(`/call/${incomingCall.conversationId}?room=${incomingCall.roomName}&name=${displayName}`);
    
    clearIncomingCall();
  };

  const handleDeclineCall = () => {
    if (!incomingCall || !socket || !user) return;

    // Send decline event to caller
    socket.emit("call:decline", {
      callerId: incomingCall.callerId,
      recipientId: user.id,
      recipientName: user.name || user.username || "User",
    });

    clearIncomingCall();
  };

  const handleCallTimeout = () => {
    if (!incomingCall || !socket || !user) return;

    // Send decline event (same as declining)
    socket.emit("call:decline", {
      callerId: incomingCall.callerId,
      recipientId: user.id,
      recipientName: user.name || user.username || "User",
    });

    clearIncomingCall();
  };

  return (
    <>
      <TooltipProvider>
        <Toaster />
        <Router />
        
        {/* Incoming Call Modal */}
        {incomingCall && (
          <IncomingCallModal
            isOpen={true}
            callerName={incomingCall.callerName}
            callerAvatar={incomingCall.callerAvatar}
            callType={incomingCall.callType}
            onAccept={handleAcceptCall}
            onDecline={handleDeclineCall}
            onTimeout={handleCallTimeout}
          />
        )}
      </TooltipProvider>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <SocketProvider>
            <AppContent />
          </SocketProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
