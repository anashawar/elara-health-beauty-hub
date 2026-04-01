import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, ArrowRight, Loader2, ShieldCheck, Mail, Sparkles, Calendar, MapPin, Globe, Check } from "lucide-react";
import NotificationPermissionPrompt from "@/components/NotificationPermissionPrompt";
import { isNativePlatform, initOneSignal } from "@/lib/nativePush";
import OneSignal from "onesignal-cordova-plugin";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
const MapPicker = lazy(() => import("@/components/MapPicker"));
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import elaraLogo from "@/assets/elara-logo.png";

import { iraqCities } from "@/data/iraqCities";

type Step = "phone" | "otp" | "address" | "language" | "notifications";
type AuthMode = "signup" | "signin";

const OTP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

const COUNTRY_CODES = [
  { code: "+964", flag: "🇮🇶", name: "Iraq", placeholder: "7XX XXX XXXX", maxLen: 11 },
  { code: "+1", flag: "🇺🇸", name: "US", placeholder: "XXX XXX XXXX", maxLen: 10 },
  { code: "+44", flag: "🇬🇧", name: "UK", placeholder: "7XXX XXXXXX", maxLen: 11 },
  { code: "+971", flag: "🇦🇪", name: "UAE", placeholder: "5X XXX XXXX", maxLen: 10 },
  { code: "+962", flag: "🇯🇴", name: "Jordan", placeholder: "7X XXX XXXX", maxLen: 10 },
  { code: "+90", flag: "🇹🇷", name: "Turkey", placeholder: "5XX XXX XXXX", maxLen: 11 },
  { code: "+966", flag: "🇸🇦", name: "KSA", placeholder: "5X XXX XXXX", maxLen: 10 },
];

const AuthPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const hasVisited = localStorage.getItem("elara_has_visited");
  const [authMode, setAuthMode] = useState<AuthMode>(hasVisited ? "signin" : "signup");

  useEffect(() => {
    localStorage.setItem("elara_has_visited", "true");
  }, []);
  const [step, setStep] = useState<Step>("phone");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [street, setStreet] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  const handleMapConfirm = (lat: number, lng: number) => {
    setGpsLat(lat);
    setGpsLng(lng);
    toast(t("addresses.locationCaptured") || "📍 Location saved!");
  };

  // Redirect already-authenticated users (only on initial load, not during OTP flow)
  const [otpInProgress, setOtpInProgress] = useState(false);
  useEffect(() => {
    if (!authLoading && user && step === "phone" && !otpInProgress) {
      navigate("/home", { replace: true });
    }
  }, [user, authLoading, navigate, step, otpInProgress]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOTP = async () => {
    if (!phone.trim()) { toast(t("auth.enterPhone")); return; }
    if (authMode === "signup" && !email.trim()) { toast(t("auth.enterEmail") || "Please enter your email"); return; }
    if (authMode === "signup" && !fullName.trim()) { toast(t("auth.enterFullName") || "Please enter your name"); return; }
    if (authMode === "signup") {
      const nameParts = fullName.trim().split(/\s+/);
      if (nameParts.length < 2 || nameParts.some(p => p.length < 2)) {
        toast(t("auth.enterFirstAndLastName") || "Please enter your first and last name");
        return;
      }
    }
    if (authMode === "signup" && !gender) { toast(t("auth.selectGender") || "Please select your gender"); return; }
    if (authMode === "signup" && !birthdate) { toast(t("auth.enterBirthdate") || "Please enter your date of birth"); return; }

    setLoading(true);
    try {
      const fullPhone = countryCode.code + phone.trim().replace(/^0/, "");
      const body: any = { phone: fullPhone, mode: authMode };
      if (authMode === "signup") {
        body.full_name = fullName.trim();
        body.email = email.trim();
        body.gender = gender || undefined;
        body.birthdate = birthdate || undefined;
      }

      const resp = await fetch(`${OTP_URL}/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to send OTP");

      setNormalizedPhone(data.phone);
      setStep("otp");
      setCountdown(60);
      toast(t("auth.otpSent") || "Verification code sent via WhatsApp!");
    } catch (e: any) {
      toast(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) { toast(t("auth.enterOtp") || "Enter the 6-digit code"); return; }

    setLoading(true);
    try {
      const body: any = { phone: normalizedPhone, code: otpCode };
      if (authMode === "signup") {
        body.full_name = fullName.trim();
        body.email = email.trim();
        body.gender = gender || undefined;
        body.birthdate = birthdate || undefined;
      }

      const resp = await fetch(`${OTP_URL}/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Verification failed");

      if (data.isNewUser) {
        toast(t("auth.accountCreated") || "Account created!");
        setStep("address");
      } else {
        toast(t("auth.welcomeBackToast") || "Welcome back!");
      }

      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      if (!data.isNewUser) {
        const seenPrompt = localStorage.getItem("elara_notif_prompt_seen");
        if (!seenPrompt && isNativePlatform()) {
          setStep("notifications");
        } else {
          navigate("/home");
        }
      }
    } catch (e: any) {
      toast(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!city) { toast(t("auth.selectCity") || "Please select your city"); return; }
    if (!gpsLat || !gpsLng) { toast(t("auth.selectLocationRequired") || "Please select your location on the map"); return; }

    setLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { toast(t("auth.signInFirst")); return; }

      const payload: any = {
        user_id: currentUser.id,
        label: "Home",
        city,
        area: area || null,
        street: street || null,
        building: building || null,
        floor: floor || null,
        apartment: apartment || null,
        phone: normalizedPhone || null,
        is_default: true,
        latitude: gpsLat,
        longitude: gpsLng,
      };
      const { error } = await supabase.from("addresses").insert(payload);

      if (error) { toast(error.message); return; }

      toast(t("auth.welcomeToElara", { name: fullName.split(" ")[0] }) || "Welcome to ELARA!");
      setStep("language");
    } finally {
      setLoading(false);
    }
  };

  const slideVariants = {
    enter: { y: 20, opacity: 0 },
    center: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
  };

  const isSignUp = authMode === "signup";

  return (
    <div className="min-h-screen bg-background md:flex md:items-center md:justify-center">
      <div className="w-full max-w-lg mx-auto md:bg-card md:rounded-3xl md:shadow-premium-lg md:border md:border-border/50 md:my-8 flex flex-col">
      {/* Logo + top spacing */}
      <div className="safe-area-top" />
      <div className="flex flex-col items-center pt-10 pb-2 px-5">
        <motion.img
          src={elaraLogo}
          alt="ELARA"
          className="h-10 object-contain mb-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        />
        <motion.div
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Sparkles className="w-3 h-3 text-primary" />
          <span>{t("common.tagline")}</span>
        </motion.div>
      </div>

      {/* Progress bar */}
      <div className={`px-5 pt-4 pb-2 flex gap-2 ${step === "notifications" ? "hidden" : ""}`}>
        <div className="h-1 flex-1 rounded-full transition-colors duration-300 bg-primary" />
        <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${["otp","address","language","notifications"].includes(step) ? "bg-primary" : "bg-muted"}`} />
        <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${["address","language","notifications"].includes(step) ? "bg-primary" : "bg-muted"}`} />
        {isSignUp && <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${["language","notifications"].includes(step) ? "bg-primary" : "bg-muted"}`} />}
      </div>

      <div className="flex-1 px-5 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Step 1: Phone (+ Name/Email for signup) */}
          {step === "phone" && (
            <motion.div
              key="phone"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-5 pt-2"
            >
              {/* Auth mode toggle */}
              <div className="flex bg-muted rounded-2xl p-1 gap-1">
                <button
                  onClick={() => setAuthMode("signin")}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    !isSignUp
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("common.signIn") || "Sign In"}
                </button>
                <button
                  onClick={() => setAuthMode("signup")}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    isSignUp
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("common.signUp") || "Sign Up"}
                </button>
              </div>

              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">
                  {isSignUp
                    ? (t("auth.createAccount") || "Create Account")
                    : (t("auth.welcomeBack") || "Welcome Back")}
                </h1>
                {isSignUp && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("auth.joinElara") || "Enter your details to get started"}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {/* Name — only for sign up */}
                <AnimatePresence>
                  {isSignUp && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1.5 pb-1">
                        <label className="text-xs font-medium text-muted-foreground">{t("auth.fullName")} *</label>
                        <p className="text-[10px] text-muted-foreground -mt-1">
                          {t("auth.realNameRequired") || "Please use your real first and last name"}
                        </p>
                        <div className="relative">
                          <User className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder={t("auth.enterFirstAndLastName") || "First and Last Name"}
                            className="pl-10 rtl:pl-3 rtl:pr-10 h-12 rounded-2xl border-border/60 bg-muted/40 focus:bg-card transition-colors"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email — only for sign up */}
                <AnimatePresence>
                  {isSignUp && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, delay: 0.05 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1.5 pb-1">
                        <label className="text-xs font-medium text-muted-foreground">{t("auth.email") || "Email"}</label>
                        <div className="relative">
                          <Mail className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t("auth.enterEmail") || "your@email.com"}
                            type="email"
                            className="pl-10 rtl:pl-3 rtl:pr-10 h-12 rounded-2xl border-border/60 bg-muted/40 focus:bg-card transition-colors"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Gender — only for sign up */}
                <AnimatePresence>
                  {isSignUp && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, delay: 0.1 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1.5 pb-1">
                        <label className="text-xs font-medium text-muted-foreground">{t("auth.gender") || "Gender"}</label>
                        <p className="text-[10px] text-muted-foreground -mt-1">
                          {t("auth.genderPurpose") || "Used to personalize product recommendations for you"}
                        </p>
                        <div className="flex gap-2">
                          {[
                            { value: "female", label: t("auth.female") || "Female", emoji: "👩" },
                            { value: "male", label: t("auth.male") || "Male", emoji: "👨" },
                          ].map(g => (
                            <button
                              key={g.value}
                              type="button"
                              onClick={() => setGender(g.value)}
                              className={`flex-1 py-3 px-3 rounded-2xl text-sm font-medium border transition-all flex items-center justify-center gap-2 ${
                                gender === g.value
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                                  : "bg-muted/40 text-foreground border-border/60 hover:border-primary/50"
                              }`}
                            >
                              <span>{g.emoji}</span>
                              {g.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Birthdate — only for sign up */}
                <AnimatePresence>
                  {isSignUp && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, delay: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1.5 pb-1">
                        <label className="text-xs font-medium text-muted-foreground">{t("auth.birthdate") || "Date of Birth"}</label>
                        <p className="text-[10px] text-muted-foreground -mt-1">
                          {t("auth.birthdatePurpose") || "Used to recommend age-appropriate skincare products"}
                        </p>
                        <div className="relative">
                          <Calendar className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="date"
                            value={birthdate}
                            onChange={(e) => setBirthdate(e.target.value)}
                            max={new Date().toISOString().split("T")[0]}
                            className="pl-10 rtl:pl-3 rtl:pr-10 h-12 rounded-2xl border-border/60 bg-muted/40 focus:bg-card transition-colors"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Phone — always */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("auth.phoneNumber")}</label>
                  <div className="flex gap-2">
                    {/* Country code selector */}
                    <button
                      type="button"
                      onClick={() => setShowCountryPicker(!showCountryPicker)}
                      className="relative h-12 px-3 rounded-2xl border border-border/60 bg-muted/40 hover:bg-muted/60 transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <span className="text-base leading-none">{countryCode.flag}</span>
                      <span className="text-xs font-semibold text-foreground">{countryCode.code}</span>
                      <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder={countryCode.placeholder}
                      type="tel"
                      className="h-12 rounded-2xl border-border/60 bg-muted/40 focus:bg-card transition-colors flex-1"
                      maxLength={countryCode.maxLen}
                    />
                  </div>
                  {/* Country picker dropdown */}
                  <AnimatePresence>
                    {showCountryPicker && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-1.5 p-2 bg-muted/30 rounded-xl border border-border/40">
                          {COUNTRY_CODES.map(cc => (
                            <button
                              key={cc.code}
                              type="button"
                              onClick={() => { setCountryCode(cc); setShowCountryPicker(false); setPhone(""); }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                countryCode.code === cc.code
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-muted/60 text-foreground"
                              }`}
                            >
                              <span>{cc.flag}</span>
                              <span>{cc.name}</span>
                              <span className="text-muted-foreground ml-auto">{cc.code}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <p className="text-[10px] text-muted-foreground">
                    {t("auth.whatsappNote") || "A verification code will be sent via WhatsApp"}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full h-12 rounded-2xl text-sm font-semibold gap-2 shadow-md shadow-primary/20"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t("auth.sending") || "Sending..."}</>
                ) : (
                  <>{t("auth.sendCode") || "Send Verification Code"} <ArrowRight className="w-4 h-4 rtl:rotate-180" /></>
                )}
              </Button>

              {/* Language selector for sign-in */}
              {!isSignUp && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    {t("auth.appLanguage") || "App Language"}
                  </label>
                  <div className="flex gap-2">
                    {([
                      { code: "en" as const, label: "English" },
                      { code: "ar" as const, label: "العربية" },
                      { code: "ku" as const, label: "کوردی" },
                    ]).map(lang => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setLanguage(lang.code)}
                        className={`flex-1 py-2.5 px-2 rounded-2xl text-xs font-medium border transition-all flex items-center justify-center gap-1.5 ${
                          language === lang.code
                            ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                            : "bg-muted/40 text-foreground border-border/60 hover:border-primary/50"
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => navigate("/home")}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                {t("common.continueAsGuest")}
              </button>
            </motion.div>
          )}

          {/* Step 2: OTP */}
          {step === "otp" && (
            <motion.div
              key="otp"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-6 pt-4"
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/40 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-display font-bold text-foreground">
                  {t("auth.verifyPhone") || "Verify Phone"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("auth.whatsappCodeSentTo") || "Enter the code sent via WhatsApp to"}{" "}
                  <span className="font-semibold text-foreground">{normalizedPhone}</span>
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <InputOTPSlot key={i} index={i} className="w-12 h-14 text-lg rounded-xl border-border/60" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                onClick={handleVerifyOTP}
                disabled={loading || otpCode.length !== 6}
                className="w-full h-12 rounded-2xl text-sm font-semibold gap-2 shadow-md shadow-primary/20"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t("auth.verifying") || "Verifying..."}</>
                ) : (
                  <>{t("auth.verify") || "Verify"} <ArrowRight className="w-4 h-4 rtl:rotate-180" /></>
                )}
              </Button>

              <div className="text-center space-y-2">
                {countdown > 0 ? (
                  <p className="text-xs text-muted-foreground">{t("auth.resendIn") || "Resend in"} {countdown}s</p>
                ) : (
                  <button onClick={handleSendOTP} disabled={loading} className="text-sm text-primary font-medium hover:underline">
                    {t("auth.resendCode") || "Resend Code"}
                  </button>
                )}
                <button
                  onClick={() => { setStep("phone"); setOtpCode(""); }}
                  className="block w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("auth.changeNumber") || "Change number"}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Address */}
          {step === "address" && (
            <motion.div
              key="address"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-5 pt-2"
            >
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">{t("auth.deliveryAddress")}</h1>
                <p className="text-sm text-muted-foreground mt-1">{t("auth.addAddressDesc")}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">{t("auth.city")} *</label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger className="h-11 rounded-2xl bg-muted/40 border-border/60 text-sm">
                      <SelectValue placeholder={t("auth.selectCity") || "Select city"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {iraqCities.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location on Map */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    {t("addresses.gpsLocation") || "📍 Location"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setMapOpen(true)}
                    className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl border-2 border-dashed transition-all text-sm font-semibold ${
                      gpsLat
                        ? "border-primary/40 bg-primary/5 text-primary"
                        : "border-border/60 bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    {gpsLat
                      ? (t("addresses.locationSaved") || "📍 Location saved — tap to change")
                      : (t("addresses.selectOnMap") || "Select location on map")}
                  </button>
                  {gpsLat && (
                    <p className="text-[10px] text-muted-foreground mt-1 text-center">
                      {gpsLat.toFixed(5)}, {gpsLng?.toFixed(5)}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("auth.area")}</label>
                  <Input value={area} onChange={e => setArea(e.target.value)} placeholder={t("auth.areaPlaceholder")} className="h-11 rounded-2xl bg-muted/40 border-border/60 text-sm focus:bg-card transition-colors" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("auth.street")}</label>
                  <Input value={street} onChange={e => setStreet(e.target.value)} placeholder={t("auth.streetPlaceholder")} className="h-11 rounded-2xl bg-muted/40 border-border/60 text-sm focus:bg-card transition-colors" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t("auth.building")}</label>
                    <Input value={building} onChange={e => setBuilding(e.target.value)} placeholder={t("auth.building")} className="h-11 rounded-2xl bg-muted/40 border-border/60 text-sm focus:bg-card transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t("auth.floor")}</label>
                    <Input value={floor} onChange={e => setFloor(e.target.value)} placeholder={t("auth.floor")} className="h-11 rounded-2xl bg-muted/40 border-border/60 text-sm focus:bg-card transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t("auth.apartment") || "Apt"}</label>
                    <Input value={apartment} onChange={e => setApartment(e.target.value)} placeholder={t("auth.apartment") || "Apt"} className="h-11 rounded-2xl bg-muted/40 border-border/60 text-sm focus:bg-card transition-colors" />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveAddress} disabled={loading} className="w-full h-12 rounded-2xl text-sm font-semibold gap-2 shadow-md shadow-primary/20">
                {loading ? t("auth.saving") : t("common.next")}
                {!loading && <ArrowRight className="w-4 h-4 rtl:rotate-180" />}
              </Button>

              <p className="text-center text-[11px] text-muted-foreground">
                {t("auth.locationRequiredNote") || "City and location are required to personalize your experience"}
              </p>
            </motion.div>
          )}

          {/* Step 4: Language Selection */}
          {step === "language" && (
            <motion.div
              key="language"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-6 pt-4"
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/40 flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-display font-bold text-foreground">
                  {t("auth.chooseLanguage") || "Choose Your Language"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("auth.chooseLanguageDesc") || "Select your preferred app language"}
                </p>
              </div>

              <div className="space-y-3">
                {([
                  { code: "en" as const, label: "English", desc: "Browse in English" },
                  { code: "ar" as const, label: "العربية", desc: "تصفح بالعربية" },
                  { code: "ku" as const, label: "کوردی", desc: "بە کوردی بگەڕێ" },
                ]).map(lang => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                      language === lang.code
                        ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                        : "border-border/60 bg-muted/30 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex-1 text-start">
                      <p className="text-sm font-semibold text-foreground">{lang.label}</p>
                      <p className="text-xs text-muted-foreground">{lang.desc}</p>
                    </div>
                    {language === lang.code && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <Button
                onClick={() => isNativePlatform() ? setStep("notifications") : navigate("/home")}
                className="w-full h-12 rounded-2xl text-sm font-semibold gap-2 shadow-md shadow-primary/20"
              >
                {t("common.startShopping") || "Start Shopping"}
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Button>
            </motion.div>
          )}

          {/* Step: Notification Permission Prompt */}
          {step === "notifications" && (
            <NotificationPermissionPrompt
              onAllow={async () => {
                localStorage.setItem("elara_notif_prompt_seen", "true");
                try {
                  if (isNativePlatform()) {
                    await initOneSignal();
                    const canRequest = await OneSignal.Notifications.canRequestPermission();
                    if (canRequest) {
                      await OneSignal.Notifications.requestPermission(true);
                    }
                  }
                } catch (e) {
                  console.warn("[Push] Permission request failed:", e);
                }
                navigate("/home");
              }}
              onSkip={() => {
                localStorage.setItem("elara_notif_prompt_seen", "true");
                navigate("/home");
              }}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="px-5 py-4 text-center">
        <p className="text-[10px] text-muted-foreground">ELARA — {t("common.tagline")}</p>
      </div>
      <Suspense fallback={null}>
        <MapPicker
          open={mapOpen}
          onClose={() => setMapOpen(false)}
          onConfirm={handleMapConfirm}
          initialLat={gpsLat}
          initialLng={gpsLng}
        />
      </Suspense>
      </div>
    </div>
  );
};

export default AuthPage;
