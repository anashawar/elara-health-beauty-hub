import { lazy, Suspense } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/hooks/useAuth";

const AuthPage = lazy(() => import("@/pages/AuthPage"));
const Index = lazy(() => import("@/pages/Index"));

const LoadingSpinner = (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const ResponsiveHome = () => {
  const isNativeApp = Capacitor.isNativePlatform();
  const { user, loading } = useAuth();

  // Native app (iOS/Android): require auth on first open
  if (isNativeApp) {
    if (loading) {
      return LoadingSpinner;
    }
    // Not logged in on native app → show auth
    if (!user) return <Suspense fallback={LoadingSpinner}><AuthPage /></Suspense>;
  }

  // Mobile browser & desktop: always show home page (with app download banners on mobile)
  return <Suspense fallback={LoadingSpinner}><Index /></Suspense>;
};

export default ResponsiveHome;
