import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff, Phone, MapPin, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

const cities = ["Baghdad", "Erbil", "Basra", "Sulaymaniyah", "Najaf", "Karbala", "Kirkuk", "Mosul", "Duhok"];

type Step = "auth" | "address" | "forgot";

const AuthPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signUp, signIn } = useAuth();
  const { t } = useLanguage();

  const [step, setStep] = useState<Step>("auth");
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [street, setStreet] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");

  useEffect(() => {
    if (!authLoading && user && step === "auth") {
      navigate("/home", { replace: true });
    }
  }, [user, authLoading, navigate, step]);

  const handleAuth = async () => {
    if (mode === "signup") {
      if (!fullName.trim()) { toast(t("auth.enterName")); return; }
      if (!phone.trim()) { toast(t("auth.enterPhone")); return; }
      if (!email.trim()) { toast(t("auth.enterEmail")); return; }
      if (!password || password.length < 6) { toast(t("auth.passwordMin")); return; }

      setLoading(true);
      try {
        const { error } = await signUp(email, password, fullName, phone);
        if (error) { toast(error.message); return; }

        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          toast(t("auth.accountCreatedVerify"));
          setMode("login");
          return;
        }

        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          await supabase.from("profiles").insert({
            user_id: newUser.id,
            full_name: fullName,
            phone: phone,
          });
        }

        toast(t("auth.accountCreated"));
        setStep("address");
      } finally {
        setLoading(false);
      }
    } else {
      if (!email || !password) { toast(t("auth.fillAllFields")); return; }
      setLoading(true);
      try {
        const { error } = await signIn(email, password);
        if (error) { toast(error.message); return; }
        toast(t("auth.welcomeBackToast"));
        navigate("/home");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveAddress = async () => {
    if (!city) { toast(t("auth.selectCity")); return; }

    setLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { toast(t("auth.signInFirst")); return; }

      const { error } = await supabase.from("addresses").insert({
        user_id: currentUser.id,
        label: "Home",
        city,
        area: area || null,
        street: street || null,
        building: building || null,
        floor: floor || null,
        phone: phone || null,
        is_default: true,
      });

      if (error) { toast(error.message); return; }

      toast(t("auth.welcomeToElara", { name: fullName.split(" ")[0] }));
      navigate("/home");
    } finally {
      setLoading(false);
    }
  };

  const slideVariants = {
    enter: { x: 80, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -80, opacity: 0 },
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto flex flex-col">
      {mode === "signup" && (
        <div className="px-5 pt-6 pb-2 flex gap-2">
          <div className={`h-1 flex-1 rounded-full transition-colors duration-300 bg-primary`} />
          <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${step === "address" ? "bg-primary" : "bg-muted"}`} />
        </div>
      )}
      {mode === "login" && <div className="pt-8" />}

      <div className="flex-1 px-5 overflow-hidden">
        <AnimatePresence mode="wait">
          {step === "auth" && (
            <motion.div
              key={mode}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">
                  {mode === "login" ? t("auth.welcomeBack") : t("auth.createAccount")}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {mode === "login" ? t("auth.signInToAccount") : t("auth.joinElara")}
                </p>
              </div>

              <div className="space-y-3">
                {mode === "signup" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t("auth.fullName")}</label>
                      <div className="relative">
                        <User className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder={t("auth.enterFullName")}
                          className="pl-10 rtl:pl-3 rtl:pr-10 h-12 rounded-xl border-border bg-card"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t("auth.phoneNumber")}</label>
                      <div className="relative">
                        <Phone className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+964 XXX XXX XXXX"
                          type="tel"
                          className="pl-10 rtl:pl-3 rtl:pr-10 h-12 rounded-xl border-border bg-card"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("auth.email")}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      type="email"
                      className="pl-10 rtl:pl-3 rtl:pr-10 h-12 rounded-xl border-border bg-card"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("auth.password")}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("auth.minChars")}
                      type={showPassword ? "text" : "password"}
                      className="pl-10 rtl:pl-10 rtl:pr-10 pr-10 h-12 rounded-xl border-border bg-card"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
              </div>

              {mode === "login" && (
                <button
                  onClick={() => setStep("forgot")}
                  className="w-full text-right rtl:text-left text-xs text-primary font-medium hover:underline -mt-1"
                >
                  {t("auth.forgotPassword")}
                </button>
              )}

              <Button onClick={handleAuth} disabled={loading} className="w-full h-12 rounded-xl text-sm font-semibold gap-2">
                {loading ? t("auth.pleaseWait") : mode === "login" ? t("common.signIn") : t("auth.createAccount")}
                {!loading && <ArrowRight className="w-4 h-4 rtl:rotate-180" />}
              </Button>

              <button
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}
              </button>

              <button
                onClick={() => navigate("/home")}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                {t("common.continueAsGuest")}
              </button>
            </motion.div>
          )}

          {step === "forgot" && (
            <motion.div
              key="forgot"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">{t("auth.resetPassword")}</h1>
                <p className="text-sm text-muted-foreground mt-1">{t("auth.resetDesc")}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t("auth.email")}</label>
                <div className="relative">
                  <Mail className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    type="email"
                    className="pl-10 rtl:pl-3 rtl:pr-10 h-12 rounded-xl border-border bg-card"
                  />
                </div>
              </div>

              <Button
                onClick={async () => {
                  if (!email.trim()) { toast(t("auth.enterEmail")); return; }
                  setLoading(true);
                  try {
                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });
                    if (error) { toast(error.message); return; }
                    toast(t("auth.resetLinkSent"));
                    setStep("auth");
                    setMode("login");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full h-12 rounded-xl text-sm font-semibold gap-2"
              >
                {loading ? t("auth.sending") : t("auth.sendResetLink")}
                {!loading && <ArrowRight className="w-4 h-4 rtl:rotate-180" />}
              </Button>

              <button
                onClick={() => { setStep("auth"); setMode("login"); }}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                {t("auth.backToSignIn")}
              </button>
            </motion.div>
          )}

          {step === "address" && (
            <motion.div
              key="address"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">{t("auth.deliveryAddress")}</h1>
                <p className="text-sm text-muted-foreground mt-1">{t("auth.addAddressDesc")}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">{t("auth.city")} *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {cities.map(c => (
                      <button
                        key={c}
                        onClick={() => setCity(c)}
                        className={`py-2.5 px-2 text-xs font-medium rounded-xl border transition-all ${
                          city === c
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("auth.area")}</label>
                  <Input value={area} onChange={e => setArea(e.target.value)} placeholder={t("auth.areaPlaceholder")} className="h-11 rounded-xl bg-card border-border text-sm" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("auth.street")}</label>
                  <Input value={street} onChange={e => setStreet(e.target.value)} placeholder={t("auth.streetPlaceholder")} className="h-11 rounded-xl bg-card border-border text-sm" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t("auth.building")}</label>
                    <Input value={building} onChange={e => setBuilding(e.target.value)} placeholder={t("auth.building")} className="h-11 rounded-xl bg-card border-border text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t("auth.floor")}</label>
                    <Input value={floor} onChange={e => setFloor(e.target.value)} placeholder={t("auth.floor")} className="h-11 rounded-xl bg-card border-border text-sm" />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveAddress} disabled={loading} className="w-full h-12 rounded-xl text-sm font-semibold gap-2">
                {loading ? t("auth.saving") : t("common.startShopping")}
                {!loading && <ArrowRight className="w-4 h-4 rtl:rotate-180" />}
              </Button>

              <button
                onClick={() => navigate("/home")}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                {t("auth.skipForNow")}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-5 py-4 text-center">
        <p className="text-[10px] text-muted-foreground">ELARA — {t("common.tagline")}</p>
      </div>
    </div>
  );
};

export default AuthPage;
