import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, ArrowRight, Loader2, ShieldCheck, Mail, Sparkles, Calendar, Navigation } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import elaraLogo from "@/assets/elara-logo.png";

import { iraqCities } from "@/data/iraqCities";

type Step = "phone" | "otp" | "address";
type AuthMode = "signup" | "signin";

const OTP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

const AuthPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();

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

  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [street, setStreet] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const handleGetLocation = async () => {
    setGpsLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const perm = await Geolocation.requestPermissions();
        if (perm.location !== "granted") {
          toast(t("addresses.locationDenied") || "Location permission denied");
          setGpsLoading(false);
          return;
        }
      }
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
      setGpsLat(position.coords.latitude);
      setGpsLng(position.coords.longitude);
      toast(t("addresses.locationCaptured") || "📍 Location captured!");
    } catch {
      if (!Capacitor.isNativePlatform() && "geolocation" in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 })
          );
          setGpsLat(pos.coords.latitude);
          setGpsLng(pos.coords.longitude);
          toast(t("addresses.locationCaptured") || "📍 Location captured!");
        } catch {
          toast(t("addresses.locationError") || "Could not get location. Please enable GPS.");
        }
      } else {
        toast(t("addresses.locationError") || "Could not get location. Please enable GPS.");
      }
    } finally {
      setGpsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user && step === "phone") {
      navigate("/home", { replace: true });
    }
  }, [user, authLoading, navigate, step]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOTP = async () => {
    if (!phone.trim()) { toast(t("auth.enterPhone")); return; }
    if (authMode === "signup" && !email.trim()) { toast(t("auth.enterEmail") || "Please enter your email"); return; }
    if (authMode === "signup" && !fullName.trim()) { toast(t("auth.enterFullName") || "Please enter your name"); return; }

    setLoading(true);
    try {
      const body: any = { phone: phone.trim() };
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
        navigate("/home");
      }
    } catch (e: any) {
      toast(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!city) { toast(t("auth.selectCity")); return; }

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
      navigate("/home");
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
    <div className="min-h-screen bg-background max-w-lg mx-auto flex flex-col">
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
      <div className="px-5 pt-4 pb-2 flex gap-2">
        <div className="h-1 flex-1 rounded-full transition-colors duration-300 bg-primary" />
        <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${step === "otp" || step === "address" ? "bg-primary" : "bg-muted"}`} />
        <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${step === "address" ? "bg-primary" : "bg-muted"}`} />
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
                        <label className="text-xs font-medium text-muted-foreground">{t("auth.fullName")}</label>
                        <div className="relative">
                          <User className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder={t("auth.enterFullName")}
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
                  <div className="relative">
                    <div className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <span className="text-base leading-none">🇮🇶</span>
                      <span className="text-xs font-semibold text-foreground">+964</span>
                    </div>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="7XX XXX XXXX"
                      type="tel"
                      className="pl-[4.5rem] rtl:pl-3 rtl:pr-[4.5rem] h-12 rounded-2xl border-border/60 bg-muted/40 focus:bg-card transition-colors"
                      maxLength={11}
                    />
                  </div>
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

                {/* GPS Location */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    {t("addresses.gpsLocation") || "📍 GPS Location"}
                  </label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={gpsLoading}
                    className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl border-2 border-dashed transition-all text-sm font-semibold ${
                      gpsLat
                        ? "border-primary/40 bg-primary/5 text-primary"
                        : "border-border/60 bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {gpsLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4" />
                    )}
                    {gpsLoading
                      ? (t("addresses.gettingLocation") || "Getting location...")
                      : gpsLat
                        ? (t("addresses.locationSaved") || "📍 Location saved")
                        : (t("addresses.useMyLocation") || "Use my current location")}
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t("auth.building")}</label>
                    <Input value={building} onChange={e => setBuilding(e.target.value)} placeholder={t("auth.building")} className="h-11 rounded-2xl bg-muted/40 border-border/60 text-sm focus:bg-card transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t("auth.floor")}</label>
                    <Input value={floor} onChange={e => setFloor(e.target.value)} placeholder={t("auth.floor")} className="h-11 rounded-2xl bg-muted/40 border-border/60 text-sm focus:bg-card transition-colors" />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveAddress} disabled={loading} className="w-full h-12 rounded-2xl text-sm font-semibold gap-2 shadow-md shadow-primary/20">
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
