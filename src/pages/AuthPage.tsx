import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, User, MapPin, ArrowRight, ArrowLeft, CheckCircle2, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "@/components/ui/sonner";

const STEPS = ["register", "otp", "address"] as const;
type Step = typeof STEPS[number];

const cities = ["Baghdad", "Erbil", "Basra", "Sulaymaniyah", "Najaf", "Karbala", "Kirkuk", "Mosul", "Duhok"];

const AuthPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("register");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const stepIndex = STEPS.indexOf(step);

  const handleRegister = () => {
    if (!phone || phone.length < 10) {
      toast("Please enter a valid phone number");
      return;
    }
    if (!fullName.trim()) {
      toast("Please enter your full name");
      return;
    }
    // Mock: send OTP
    toast("OTP sent to " + phone);
    setStep("otp");
  };

  const handleVerifyOtp = () => {
    if (otp.length < 6) {
      toast("Please enter the 6-digit code");
      return;
    }
    // Mock: verify OTP (accept any 6 digits)
    toast("Phone verified successfully!");
    setStep("address");
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast("Geolocation not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast("Location detected!");
      },
      () => {
        setLocating(false);
        toast("Could not get location. Please enter manually.");
      },
      { timeout: 10000 }
    );
  };

  const handleFinish = () => {
    if (!city) {
      toast("Please select your city");
      return;
    }
    toast("Welcome to ELARA, " + fullName.split(" ")[0] + "! 🎉");
    navigate("/");
  };

  const slideVariants = {
    enter: { x: 80, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -80, opacity: 0 },
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto flex flex-col">
      {/* Header */}
      <header className="px-5 pt-6 pb-2 flex items-center gap-3">
        {stepIndex > 0 && (
          <button onClick={() => setStep(STEPS[stepIndex - 1])} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
        )}
        <div className="flex-1" />
      </header>

      {/* Progress */}
      <div className="px-5 flex gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= stepIndex ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 px-5 overflow-hidden">
        <AnimatePresence mode="wait">
          {step === "register" && (
            <motion.div
              key="register"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Create Account</h1>
                <p className="text-sm text-muted-foreground mt-1">Join ELARA for Iraq's best health & beauty</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Full Name</label>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Phone Number</label>
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
              </div>

              <Button onClick={handleRegister} className="w-full h-12 rounded-xl text-sm font-semibold gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>

              <button
                onClick={() => navigate("/")}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Continue as Guest
              </button>
            </motion.div>
          )}

          {step === "otp" && (
            <motion.div
              key="otp"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Verify Phone</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the 6-digit code sent to <span className="font-semibold text-foreground">{phone}</span>
                </p>
              </div>

              <div className="flex justify-center py-4">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} className="w-11 h-12 rounded-lg border-border bg-card text-foreground" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button onClick={handleVerifyOtp} className="w-full h-12 rounded-xl text-sm font-semibold gap-2">
                Verify <CheckCircle2 className="w-4 h-4" />
              </Button>

              <button className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
                Resend code in 30s
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
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Your Address</h1>
                <p className="text-sm text-muted-foreground mt-1">So we can deliver to you</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">City</label>
                  <div className="grid grid-cols-3 gap-2">
                    {cities.map((c) => (
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

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Street / Area</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Street name, area, building"
                      className="pl-10 h-12 rounded-xl border-border bg-card"
                    />
                  </div>
                </div>

                <button
                  onClick={handleGetLocation}
                  disabled={locating}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary/40 text-primary text-sm font-medium hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  {locating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4" />
                  )}
                  {locating ? "Detecting location..." : coords ? "Location detected ✓" : "Use GPS Location"}
                </button>
              </div>

              <Button onClick={handleFinish} className="w-full h-12 rounded-xl text-sm font-semibold gap-2">
                Start Shopping <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer branding */}
      <div className="px-5 py-6 text-center">
        <p className="text-[10px] text-muted-foreground">ELARA — Iraq's Smart Health & Beauty</p>
      </div>
    </div>
  );
};

export default AuthPage;
