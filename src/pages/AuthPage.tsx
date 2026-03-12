import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff, Phone, MapPin, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const cities = ["Baghdad", "Erbil", "Basra", "Sulaymaniyah", "Najaf", "Karbala", "Kirkuk", "Mosul", "Duhok"];

type Step = "auth" | "address" | "forgot";

const AuthPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signUp, signIn } = useAuth();

  const [step, setStep] = useState<Step>("auth");
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Address fields
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [street, setStreet] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");

  // If already logged in and not in address step, redirect
  useEffect(() => {
    if (!authLoading && user && step === "auth") {
      navigate("/home", { replace: true });
    }
  }, [user, authLoading, navigate, step]);

  const handleAuth = async () => {
    if (mode === "signup") {
      if (!fullName.trim()) { toast("Please enter your full name"); return; }
      if (!phone.trim()) { toast("Please enter your phone number"); return; }
      if (!email.trim()) { toast("Please enter your email"); return; }
      if (!password || password.length < 6) { toast("Password must be at least 6 characters"); return; }

      setLoading(true);
      try {
        const { error } = await signUp(email, password, fullName, phone);
        if (error) { toast(error.message); return; }

        // Try to sign in immediately
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          toast("Account created! Please check your email to verify, then sign in.");
          setMode("login");
          return;
        }

        // Create profile
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          await supabase.from("profiles").insert({
            user_id: newUser.id,
            full_name: fullName,
            phone: phone,
          });
        }

        toast("Account created! Now add your delivery address 📍");
        setStep("address");
      } finally {
        setLoading(false);
      }
    } else {
      if (!email || !password) { toast("Please fill in all fields"); return; }
      setLoading(true);
      try {
        const { error } = await signIn(email, password);
        if (error) { toast(error.message); return; }
        toast("Welcome back! 🎉");
        navigate("/home");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveAddress = async () => {
    if (!city) { toast("Please select your city"); return; }

    setLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { toast("Please sign in first"); return; }

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

      toast("Welcome to ELARA, " + fullName.split(" ")[0] + "! 🎉");
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
      {/* Progress bar */}
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
                  {mode === "login" ? "Welcome Back" : "Create Account"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {mode === "login" ? "Sign in to your ELARA account" : "Join ELARA for Iraq's best health & beauty"}
                </p>
              </div>

              <div className="space-y-3">
                {mode === "signup" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Enter your full name"
                          className="pl-10 h-12 rounded-xl border-border bg-card"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+964 XXX XXX XXXX"
                          type="tel"
                          className="pl-10 h-12 rounded-xl border-border bg-card"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      type="email"
                      className="pl-10 h-12 rounded-xl border-border bg-card"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      type={showPassword ? "text" : "password"}
                      className="pl-10 pr-10 h-12 rounded-xl border-border bg-card"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
              </div>

              {mode === "login" && (
                <button
                  onClick={() => setStep("forgot")}
                  className="w-full text-right text-xs text-primary font-medium hover:underline -mt-1"
                >
                  Forgot password?
                </button>
              )}

              <Button onClick={handleAuth} disabled={loading} className="w-full h-12 rounded-xl text-sm font-semibold gap-2">
                {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </Button>

              <button
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                {mode === "login" ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </button>

              <button
                onClick={() => navigate("/home")}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Continue as Guest
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
                <h1 className="text-2xl font-display font-bold text-foreground">Reset Password</h1>
                <p className="text-sm text-muted-foreground mt-1">Enter your email and we'll send you a reset link</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    type="email"
                    className="pl-10 h-12 rounded-xl border-border bg-card"
                  />
                </div>
              </div>

              <Button
                onClick={async () => {
                  if (!email.trim()) { toast("Please enter your email"); return; }
                  setLoading(true);
                  try {
                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });
                    if (error) { toast(error.message); return; }
                    toast("Reset link sent! Check your inbox 📧");
                    setStep("auth");
                    setMode("login");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full h-12 rounded-xl text-sm font-semibold gap-2"
              >
                {loading ? "Sending..." : "Send Reset Link"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </Button>

              <button
                onClick={() => { setStep("auth"); setMode("login"); }}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Back to Sign In
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
                <h1 className="text-2xl font-display font-bold text-foreground">Delivery Address</h1>
                <p className="text-sm text-muted-foreground mt-1">Add your address so we can deliver to you</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">City *</label>
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
                  <label className="text-xs font-medium text-muted-foreground">Area / Neighborhood</label>
                  <Input value={area} onChange={e => setArea(e.target.value)} placeholder="e.g. Mansour, Karrada" className="h-11 rounded-xl bg-card border-border text-sm" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Street</label>
                  <Input value={street} onChange={e => setStreet(e.target.value)} placeholder="Street name" className="h-11 rounded-xl bg-card border-border text-sm" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Building</label>
                    <Input value={building} onChange={e => setBuilding(e.target.value)} placeholder="Building" className="h-11 rounded-xl bg-card border-border text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Floor / Apt</label>
                    <Input value={floor} onChange={e => setFloor(e.target.value)} placeholder="Floor / Apt" className="h-11 rounded-xl bg-card border-border text-sm" />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveAddress} disabled={loading} className="w-full h-12 rounded-xl text-sm font-semibold gap-2">
                {loading ? "Saving..." : "Start Shopping"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </Button>

              <button
                onClick={() => navigate("/home")}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Skip for now
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-5 py-4 text-center">
        <p className="text-[10px] text-muted-foreground">ELARA — Iraq's Smart Health & Beauty</p>
      </div>
    </div>
  );
};

export default AuthPage;
