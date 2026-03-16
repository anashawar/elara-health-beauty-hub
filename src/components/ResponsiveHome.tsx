import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/hooks/useAuth";
import AuthPage from "@/pages/AuthPage";
import Index from "@/pages/Index";

const ResponsiveHome = () => {
  const isNativeApp = Capacitor.isNativePlatform();
  const { user, loading } = useAuth();

  // Native app (iOS/Android): require auth on first open
  if (isNativeApp) {
    if (loading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    // Not logged in on native app → show auth
    if (!user) return <AuthPage />;
  }

  // Mobile browser & desktop: always show home page (with app download banners on mobile)
  return <Index />;
};

export default ResponsiveHome;
