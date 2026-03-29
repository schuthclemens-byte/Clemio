import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import OfflineBanner from "@/components/OfflineBanner";
import { I18nProvider } from "@/contexts/I18nContext";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ColorThemeProvider } from "@/contexts/ColorThemeContext";
import { ChatBackgroundProvider } from "@/contexts/ChatBackgroundContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CallProvider } from "@/contexts/CallContext";
import { useAutoPush } from "@/hooks/useAutoPush";
import { usePresence } from "@/hooks/usePresence";
import IncomingCallOverlay from "@/components/IncomingCallOverlay";
import ProtectedRoute from "@/components/ProtectedRoute";
import PushPromptSheet from "@/components/PushPromptSheet";

// Eagerly loaded (critical path)
import Index from "./pages/Index";

// Lazy loaded routes
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ChatListPage = lazy(() => import("./pages/ChatListPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const FocusModePage = lazy(() => import("./pages/FocusModePage"));
const ContactAutoplayPage = lazy(() => import("./pages/ContactAutoplayPage"));
const CallPage = lazy(() => import("./pages/CallPage"));
const CallHistoryPage = lazy(() => import("./pages/CallHistoryPage"));
const InstallPage = lazy(() => import("./pages/InstallPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const VoiceRecordingsPage = lazy(() => import("./pages/VoiceRecordingsPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const ImpressumPage = lazy(() => import("./pages/ImpressumPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

/** Runs presence tracking globally inside AuthProvider context */
const PresenceTracker = ({ children }: { children: React.ReactNode }) => {
  usePresence();
  useAutoPush();
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <ThemeProvider>
      <ColorThemeProvider>
      <ChatBackgroundProvider>
      <AccessibilityProvider>
        <AuthProvider>
          <CallProvider>
          <PresenceTracker>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <OfflineBanner />
            <BrowserRouter>
              <IncomingCallOverlay />
              <PushPromptSheet />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/landing" element={<LandingPage />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/chats" element={<ProtectedRoute><ChatListPage /></ProtectedRoute>} />
                  <Route path="/chat/:id" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                  <Route path="/focus-mode" element={<ProtectedRoute><FocusModePage /></ProtectedRoute>} />
                  <Route path="/contact-autoplay" element={<ProtectedRoute><ContactAutoplayPage /></ProtectedRoute>} />
                  <Route path="/voice-recordings" element={<ProtectedRoute><VoiceRecordingsPage /></ProtectedRoute>} />
                  <Route path="/call-history" element={<ProtectedRoute><CallHistoryPage /></ProtectedRoute>} />
                  <Route path="/call/:id" element={<ProtectedRoute><CallPage /></ProtectedRoute>} />
                  <Route path="/install" element={<InstallPage />} />
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/impressum" element={<ImpressumPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
          </PresenceTracker>
          </CallProvider>
        </AuthProvider>
      </AccessibilityProvider>
      </ChatBackgroundProvider>
      </ColorThemeProvider>
      </ThemeProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
