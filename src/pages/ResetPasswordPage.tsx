import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    if (password.length < 6) {
      toast(t("resetPassword.passwordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      toast(t("resetPassword.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast(error.message);
        return;
      }
      setSuccess(true);
      toast(t("resetPassword.passwordSuccess"));
      setTimeout(() => navigate("/home"), 2000);
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery && !success) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto flex flex-col items-center justify-center px-5">
        <p className="text-sm text-muted-foreground text-center">
          {t("resetPassword.invalidLink")}
        </p>
        <Button onClick={() => navigate("/auth")} variant="outline" className="mt-4 rounded-xl">
          {t("auth.backToSignIn")}
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto flex flex-col items-center justify-center px-5">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4"
        >
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </motion.div>
        <h2 className="text-xl font-display font-bold text-foreground mb-2">{t("resetPassword.passwordUpdated")}</h2>
        <p className="text-sm text-muted-foreground text-center">{t("resetPassword.redirecting")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto flex flex-col">
      <div className="flex-1 px-5 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{t("resetPassword.setNewPassword")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("resetPassword.chooseStrong")}</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("resetPassword.newPassword")}</label>
              <div className="relative">
                <Lock className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t("auth.minChars")}
                  type={showPassword ? "text" : "password"}
                  className="pl-10 rtl:pl-10 rtl:pr-10 pr-10 h-12 rounded-xl border-border bg-card"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2">
                  {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("resetPassword.confirmPassword")}</label>
              <div className="relative">
                <Lock className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={t("resetPassword.reEnter")}
                  type={showPassword ? "text" : "password"}
                  className="pl-10 rtl:pl-3 rtl:pr-10 h-12 rounded-xl border-border bg-card"
                />
              </div>
            </div>
          </div>

          <Button onClick={handleReset} disabled={loading} className="w-full h-12 rounded-xl text-sm font-semibold gap-2">
            {loading ? t("resetPassword.updating") : t("resetPassword.updatePassword")}
            {!loading && <ArrowRight className="w-4 h-4 rtl:rotate-180" />}
          </Button>
        </motion.div>
      </div>

      <div className="px-5 py-4 text-center">
        <p className="text-[10px] text-muted-foreground">ELARA — {t("common.tagline")}</p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
