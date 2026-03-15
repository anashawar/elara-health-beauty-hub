import { useIsMobile } from "@/hooks/use-mobile";
import AuthPage from "@/pages/AuthPage";
import Index from "@/pages/Index";

const ResponsiveHome = () => {
  const isMobile = useIsMobile();

  // On desktop/laptop, skip auth and show the store directly
  // On mobile, show the auth page as the entry point
  return isMobile ? <AuthPage /> : <Index />;
};

export default ResponsiveHome;
