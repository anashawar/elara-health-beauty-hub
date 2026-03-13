import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground mb-1">
          {t("auth.signInRequired") || "Sign in required"}
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {t("auth.signInRequiredDesc") || "Please sign in to access this feature"}
        </p>
        <Button onClick={() => navigate("/")} className="rounded-2xl px-8 h-11">
          {t("common.signIn") || "Sign In"}
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
