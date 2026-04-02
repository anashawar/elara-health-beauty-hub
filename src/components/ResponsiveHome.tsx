import { lazy, Suspense, useState, useEffect } from "react";
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
  const [timedOut, setTimedOut] = useState(false);

  // Safety: if auth loading takes more than 4 seconds on native, show auth page
  useEffect(() => {
    if (!isNativeApp || !loading) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      console.warn("[ResponsiveHome] Auth loading timed out after 4s");
      setTimedOut(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, [loading, isNativeApp]);

  // Native app (iOS/Android): require auth on first open
  if (isNativeApp) {
    if (loading && !timedOut) {
      return LoadingSpinner;
    }
    // Not logged in (or timed out checking) → show auth
    if (!user) return <Suspense fallback={LoadingSpinner}><AuthPage /></Suspense>;
  }

  // Mobile browser & desktop: always show home page
  return <Suspense fallback={LoadingSpinner}><Index /></Suspense>;
};

export default ResponsiveHome;
