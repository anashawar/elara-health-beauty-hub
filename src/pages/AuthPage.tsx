import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";

const AuthPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signUp, signIn } = useAuth();
  
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/home", { replace: true });
    }
  }, [user, authLoading, navigate]);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      toast("Please fill in all fields");
      return;
    }
    if (mode === "signup" && !fullName.trim()) {
      toast("Please enter your full name");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast(error.message);
        } else {
          // After signup, try to sign in immediately (works if auto-confirm is on)
          const { error: signInError } = await signIn(email, password);
          if (signInError) {
            toast("Account created! Please check your email to verify, then sign in.");
            setMode("login");
          } else {
            toast("Welcome to ELARA, " + (fullName.split(" ")[0] || "") + "! 🎉");
            navigate("/home");
          }
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast(error.message);
        } else {
          toast("Welcome back! 🎉");
          navigate("/home");
        }
      }
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
      <header className="px-5 pt-6 pb-2 flex items-center gap-3">
        <div className="flex-1" />
      </header>

      <div className="flex-1 px-5 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                {mode === "login" ? "Welcome Back" : "Create Account"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === "login" ? "Sign in to your ELARA account" : "Join ELARA for Iraq's best health & beauty"}
              </p>
            </div>

            <div className="space-y-4">
              {mode === "signup" && (
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
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
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
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full h-12 rounded-xl text-sm font-semibold gap-2"
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>

            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              {mode === "login" ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>

            <button
              onClick={() => navigate("/home")}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Continue as Guest
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-5 py-6 text-center">
        <p className="text-[10px] text-muted-foreground">ELARA — Iraq's Smart Health & Beauty</p>
      </div>
    </div>
  );
};

export default AuthPage;
