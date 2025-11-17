import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SocketProvider } from "./contexts/SocketContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import ChatList from "./pages/ChatList";
import ChatRoom from "./pages/ChatRoom";
import VideoCall from "./pages/VideoCall";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/chats" component={ChatList} />
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

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <SocketProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </SocketProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
