import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Sparkles, ArrowLeft, RotateCcw, Droplets, Zap, Eye, Fingerprint, AlertTriangle, Sun, Moon, Calendar, ShoppingBag, ArrowRight, ChevronDown, ChevronUp, Scan, Clock, History, Share2, FileDown } from "lucide-react";
import FaceTrackingOverlay from "@/components/skin-scan/FaceTrackingOverlay";
import NativeFaceScanner from "@/components/skin-scan/NativeFaceScanner";
import { Capacitor } from "@capacitor/core";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "@/components/ui/sonner";
import BottomNav from "@/components/layout/BottomNav";
import NativeAppGate from "@/components/NativeAppGate";
import { generateSkinReportPdf } from "@/lib/generateSkinReportPdf";
import { savePdfBlob } from "@/lib/savePdfBlob";
import { useQuery } from "@tanstack/react-query";

type Phase = "capture" | "scanning" | "results";

interface SkinProblem {
  name: string;
  severity: string;
  description: string;
  affected_areas: string;
}

interface RoutineStep {
  step: number;
  action: string;
  details: string;
  why?: string;
  frequency?: string;
}

interface Analysis {
  overall_score: number;
  skin_type: string;
  hydration_score: number;
  elasticity_score: number;
  clarity_score: number;
  texture_score: number;
  acne_score?: number;
  pigmentation_score?: number;
  dryness_score?: number;
  oiliness_score?: number;
  pores_score?: number;
  dark_circles_score?: number;
  problems: SkinProblem[];
  routine: { morning: RoutineStep[]; evening: RoutineStep[]; weekly?: RoutineStep[] };
  recommended_product_ids: string[];
  lifestyle_tips: string[];
  summary: string;
}

interface Product {
  id: string;
  title: string;
  title_ar: string | null;
  title_ku: string | null;
  slug: string;
  price: number;
  product_images: { image_url: string }[];
}

// Score ring component
const ScoreRing = ({ score, size = 80, label, color }: { score: number; size?: number; label: string; color: string }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
          strokeDasharray={circ}
        />
      </svg>
      <motion.span
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="absolute text-sm font-display font-black text-foreground"
        style={{ marginTop: (size - 20) / 2 }}
      >
        {score}
      </motion.span>
      <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
};

export default function SkinScanPage() {
  return (
    <NativeAppGate featureName="ELARA AI Skin Analyzer">
      <SkinScanContent />
    </NativeAppGate>
  );
}

function SkinScanContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isRtl = language === "ar" || language === "ku";
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("capture");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStep, setScanStep] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>("morning");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [useFrontCamera, setUseFrontCamera] = useState(true);
  const [showNativeScanner, setShowNativeScanner] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  const scanSteps = [
    { label: language === "ar" ? "تحليل البشرة..." : language === "ku" ? "شیکردنەوەی پێست..." : "Mapping skin texture...", icon: Fingerprint },
    { label: language === "ar" ? "فحص الترطيب..." : language === "ku" ? "پشکنینی شێداری..." : "Measuring hydration levels...", icon: Droplets },
    { label: language === "ar" ? "كشف المشاكل..." : language === "ku" ? "دۆزینەوەی کێشەکان..." : "Detecting skin concerns...", icon: Eye },
    { label: language === "ar" ? "بناء الروتين المخصص..." : language === "ku" ? "دروستکردنی ڕووتین..." : "Building your personalized routine...", icon: Sparkles },
  ];

  // Fetch past scans count
  const { data: pastScans = [] } = useQuery({
    queryKey: ["skin-scans", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("skin_analyses")
        .select("id, overall_score, skin_type, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user,
  });

  // Start camera
  const startCamera = useCallback(async () => {
    // On native iOS/Android, open the NativeFaceScanner with live tracking
    if (isNative) {
      setShowNativeScanner(true);
      return;
    }

    // Web fallback: use getUserMedia
    try {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: useFrontCamera ? "user" : "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Camera access denied";
      console.error("Camera error:", err);
      toast.error(msg.includes("NotAllowed") || msg.includes("Permission")
        ? (language === "ar" ? "يرجى السماح بالوصول للكاميرا" : "Please allow camera access in your browser settings")
        : (language === "ar" ? "تعذر فتح الكاميرا" : "Could not open camera"));
    }
  }, [useFrontCamera, language]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    if (useFrontCamera) {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0);
    const dataUrl = c.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
    analyzeSkin(dataUrl);
  }, [stopCamera, useFrontCamera]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCapturedImage(dataUrl);
      analyzeSkin(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Analyze skin
  const analyzeSkin = async (dataUrl: string) => {
    setPhase("scanning");
    setScanProgress(0);
    setScanStep(0);

    const stepDuration = 3000;
    const totalSteps = scanSteps.length;
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 95) { clearInterval(interval); return 95; }
        return prev + 1;
      });
    }, (stepDuration * totalSteps) / 95);

    const stepInterval = setInterval(() => {
      setScanStep(prev => {
        if (prev >= totalSteps - 1) { clearInterval(stepInterval); return totalSteps - 1; }
        return prev + 1;
      });
    }, stepDuration);

    try {
      const base64 = dataUrl.split(",")[1];
      const { data, error } = await supabase.functions.invoke("skin-analysis", {
        body: { imageBase64: base64, language },
      });

      clearInterval(interval);
      clearInterval(stepInterval);

      if (error) throw error;
      
      // Handle no face detected
      if (data?.error === "no_face_detected") {
        const noFaceMsg = language === "ar" 
          ? "⚠️ لم يتم اكتشاف وجه! يرجى رفع صورة واضحة لوجهك فقط." 
          : language === "ku" 
            ? "⚠️ دەموچاو نەدۆزرایەوە! تکایە تەنها وێنەیەکی ڕوون لە دەموچاوت هەڵبگرە."
            : "⚠️ No face detected! Please upload a clear photo of your face only.";
        toast.error(noFaceMsg, { duration: 5000 });
        setPhase("capture");
        setCapturedImage(null);
        return;
      }
      
      if (data?.error) throw new Error(data.error);

      const result = data.analysis as Analysis;
      setAnalysis(result);

      // Fetch recommended products
      if (result.recommended_product_ids?.length) {
        const { data: prods } = await supabase
          .from("products")
          .select("id, title, title_ar, title_ku, slug, price, product_images(image_url)")
          .in("id", result.recommended_product_ids);
        setProducts(prods || []);
      }

      // Save analysis to database
      await supabase.from("skin_analyses").insert({
        user_id: user!.id,
        overall_score: result.overall_score,
        skin_type: result.skin_type,
        hydration_score: result.hydration_score,
        elasticity_score: result.elasticity_score,
        clarity_score: result.clarity_score,
        texture_score: result.texture_score,
        problems: result.problems as any,
        routine: result.routine as any,
        recommended_product_ids: result.recommended_product_ids,
        full_analysis: result as any,
      });

      setScanProgress(100);
      setTimeout(() => setPhase("results"), 800);
    } catch (err: any) {
      clearInterval(interval);
      clearInterval(stepInterval);
      console.error(err);
      toast.error(err.message || "Analysis failed");
      setPhase("capture");
    }
  };

  const reset = () => {
    setPhase("capture");
    setAnalysis(null);
    setProducts([]);
    setCapturedImage(null);
    setScanProgress(0);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "hsl(142 76% 36%)";
    if (score >= 60) return "hsl(38 92% 50%)";
    return "hsl(0 84% 60%)";
  };

  const getSeverityColor = (severity: string) => {
    if (severity === "mild") return "bg-green-500/10 text-green-600";
    if (severity === "moderate") return "bg-amber-500/10 text-amber-600";
    return "bg-red-500/10 text-red-600";
  };

  const getProductTitle = (p: Product) => {
    if (language === "ar" && p.title_ar) return p.title_ar;
    if (language === "ku" && p.title_ku) return p.title_ku;
    return p.title;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="text-center px-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500 via-primary to-violet-500 mx-auto mb-4 flex items-center justify-center shadow-lg">
            <Scan className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">ELARA AI Skin Analyzer</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {language === "ar" ? "سجل دخول لتحليل بشرتك" : "Sign in to analyze your skin"}
          </p>
          <button onClick={() => navigate("/auth")} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
            {language === "ar" ? "تسجيل الدخول" : "Sign In"}
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ─── CAPTURE PHASE ────────────────────────────────────
  if (phase === "capture") {
    return (
      <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/30" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary"><ArrowLeft className="w-5 h-5 rtl:rotate-180" /></button>
              <div className="flex items-center gap-2">
                <Scan className="w-5 h-5 text-primary" />
                <h1 className="text-lg font-display font-bold">ELARA AI Skin Analyzer</h1>
              </div>
            </div>
            {pastScans.length > 0 && (
              <Link to="/skin-scan/history" className="flex items-center gap-1 text-xs text-primary font-medium">
                <History className="w-3.5 h-3.5" />
                {language === "ar" ? "السجل" : "History"}
              </Link>
            )}
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 py-6 pb-24">
          {/* Camera view */}
          {cameraActive ? (
            <div className="relative rounded-3xl overflow-hidden bg-foreground/5 aspect-[3/4]">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={useFrontCamera ? { transform: "scaleX(-1)" } : {}} />
              
              {/* Live face tracking overlay */}
              <FaceTrackingOverlay videoRef={videoRef as React.RefObject<HTMLVideoElement>} mirrored={useFrontCamera} />

              {/* Corner brackets + branding (always visible) */}
              <div className="absolute inset-0 pointer-events-none z-20">
                <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-primary/60 rounded-tl-lg" />
                <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-primary/60 rounded-tr-lg" />
                <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-primary/60 rounded-bl-lg" />
                <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-primary/60 rounded-br-lg" />
                {/* Scan line */}
                <motion.div
                  animate={{ y: ["0%", "100%", "0%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
                />
                {/* ELARA branding */}
                <div className="absolute top-4 left-0 right-0 text-center">
                  <span className="text-[10px] font-bold tracking-widest text-white/60 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
                    ELARA AI • LIVE TRACKING
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-6">
                <button onClick={stopCamera} className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button onClick={capturePhoto} className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg border-4 border-background/50">
                  <Camera className="w-7 h-7 text-primary-foreground" />
                </button>
                <button onClick={() => { stopCamera(); setUseFrontCamera(p => !p); setTimeout(startCamera, 100); }} className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Hero */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                <div className="relative w-24 h-24 mx-auto mb-5">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-rose-500 via-primary to-violet-500 flex items-center justify-center shadow-xl">
                    <Scan className="w-12 h-12 text-white" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 border-2 border-primary rounded-3xl"
                  />
                </div>
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">
                    {language === "ar" ? "مدعوم بالذكاء الاصطناعي" : language === "ku" ? "بە هێزی AI" : "Powered by AI"}
                  </span>
                </div>
                <h2 className="text-2xl font-display font-black text-foreground mb-2">
                  ELARA AI Skin Analyzer
                </h2>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  {language === "ar" ? "التقط صورة سيلفي واحصل على تحليل بشرة علمي مفصل مع روتين مخصص لك ومنتجات موصى بها" : language === "ku" ? "سێلفییەک بگرە و شیکردنەوەی زانستیی پێست و ڕووتینی تایبەت وەربگرە" : "Capture a selfie and receive a detailed scientific skin analysis with a personalized routine and product recommendations"}
                </p>
              </motion.div>

              {/* Feature badges */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="flex flex-wrap justify-center gap-2 mb-6">
                {[
                  { icon: "🔬", text: language === "ar" ? "تحليل علمي" : "Scientific Analysis" },
                  { icon: "🧴", text: language === "ar" ? "منتجات مخصصة" : "Product Matching" },
                  { icon: "📊", text: language === "ar" ? "نتائج فورية" : "Instant Results" },
                ].map((b, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-[10px] font-medium bg-secondary text-muted-foreground px-3 py-1.5 rounded-full">
                    <span>{b.icon}</span> {b.text}
                  </span>
                ))}
              </motion.div>

              {/* Action buttons */}
              <div className="space-y-3">
                <motion.button
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  onClick={startCamera}
                  className="w-full flex items-center gap-4 p-5 bg-gradient-to-br from-rose-500 via-primary to-violet-500 rounded-2xl shadow-lg group relative overflow-hidden"
                >
                  <motion.div
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-0 bottom-0 w-16 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center relative z-10">
                    <Camera className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-start flex-1 relative z-10">
                    <h3 className="text-base font-bold text-white">
                      {language === "ar" ? "امسح وجهك الآن" : language === "ku" ? "ئێستا دەموچاوت بسکانکە" : "Scan Your Face Now"}
                    </h3>
                    <p className="text-xs text-white/70 mt-0.5">
                      {language === "ar" ? "مسح مباشر بتقنية ELARA AI" : language === "ku" ? "سکانی ڕاستەوخۆ بە ELARA AI" : "Live scan with ELARA AI technology"}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/60 rtl:rotate-180 relative z-10" />
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-4 p-5 bg-card rounded-2xl border border-border shadow-sm"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-primary" />
                  </div>
                  <div className="text-start flex-1">
                    <h3 className="text-base font-bold text-foreground">
                      {language === "ar" ? "ارفع صورة" : language === "ku" ? "وێنەیەک هەڵبگرە" : "Upload Photo"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {language === "ar" ? "اختر صورة وجه من المعرض" : language === "ku" ? "وێنەی دەموچاو لە گالەری هەڵبژێرە" : "Choose a face photo from gallery"}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground/40 rtl:rotate-180" />
                </motion.button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </div>

              {/* Past scans */}
              {pastScans.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      {language === "ar" ? "تحليلاتك السابقة" : language === "ku" ? "شیکردنەوەکانی پێشووت" : "Your Past Scans"}
                    </h4>
                    <Link to="/skin-scan/history" className="text-[10px] text-primary font-medium">
                      {language === "ar" ? "عرض الكل" : "View All"}
                    </Link>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {pastScans.map(scan => (
                      <Link key={scan.id} to={`/skin-scan/history`} className="flex-shrink-0 bg-card rounded-xl border border-border/50 p-3 min-w-[120px]">
                        <div className="text-center">
                          <span className={`text-lg font-display font-black ${(scan.overall_score ?? 0) >= 70 ? 'text-green-600' : (scan.overall_score ?? 0) >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                            {scan.overall_score}
                          </span>
                          <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{scan.skin_type}</p>
                          <p className="text-[9px] text-muted-foreground/60 mt-1">{new Date(scan.created_at).toLocaleDateString()}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Tips */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-6 bg-card rounded-2xl border border-border/50 p-4">
                <h4 className="text-xs font-bold text-foreground mb-3">
                  {language === "ar" ? "للحصول على أفضل النتائج:" : language === "ku" ? "بۆ باشترین ئەنجام:" : "For best results:"}
                </h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {[
                    language === "ar" ? "✧ إضاءة طبيعية جيدة" : language === "ku" ? "✧ ڕووناکی سروشتی باش" : "✧ Good natural lighting",
                    language === "ar" ? "✧ وجه نظيف بدون مكياج" : language === "ku" ? "✧ دەموچاوی پاک بێ مەیکئەپ" : "✧ Clean face, no makeup",
                    language === "ar" ? "✧ صورة واضحة قريبة" : language === "ku" ? "✧ وێنەی ڕوون و نزیک" : "✧ Clear, close-up photo",
                  ].map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </motion.div>
            </>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <BottomNav />
      </div>
    );
  }

  // ─── SCANNING PHASE ────────────────────────────────────
  if (phase === "scanning") {
    const StepIcon = scanSteps[scanStep]?.icon || Sparkles;
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          {/* ELARA branding */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-6"
          >
            ELARA AI SKIN ANALYZER
          </motion.p>

          {/* Captured image with scanning overlay */}
          {capturedImage && (
            <div className="relative w-48 h-48 rounded-full overflow-hidden mx-auto mb-8 border-4 border-primary/30">
              <img src={capturedImage} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-primary/10" />
              <motion.div
                animate={{ y: ["-100%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-x-0 h-1/3 bg-gradient-to-b from-primary/30 via-primary/15 to-transparent"
              />
              {/* Pulse ring */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 border-2 border-primary rounded-full"
              />
            </div>
          )}

          {/* Step icon */}
          <motion.div
            key={scanStep}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"
          >
            <StepIcon className="w-7 h-7 text-primary" />
          </motion.div>

          {/* Step label */}
          <AnimatePresence mode="wait">
            <motion.p
              key={scanStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm font-semibold text-foreground mb-6"
            >
              {scanSteps[scanStep]?.label}
            </motion.p>
          </AnimatePresence>

          {/* Progress bar */}
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-2">
            <motion.div
              className="h-full bg-gradient-to-r from-rose-500 via-primary to-violet-500 rounded-full"
              animate={{ width: `${scanProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{scanProgress}%</p>
        </div>
      </div>
    );
  }

  // ─── RESULTS PHASE ────────────────────────────────────
  if (phase === "results" && analysis) {
    return (
      <div className="min-h-screen bg-background pb-24" dir={isRtl ? "rtl" : "ltr"}>
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/30" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button onClick={reset} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary"><ArrowLeft className="w-5 h-5 rtl:rotate-180" /></button>
              <h1 className="text-lg font-display font-bold">
                {language === "ar" ? "تقرير ELARA AI" : language === "ku" ? "ڕاپۆرتی ELARA AI" : "Your ELARA AI Report"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    toast.info(language === "ar" ? "جاري إنشاء التقرير..." : "Generating report...");
                    const blob = await generateSkinReportPdf(analysis as any, user?.user_metadata?.full_name || "", language);
                    const fileName = `ELARA-Skin-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
                    await savePdfBlob(blob, fileName);
                    toast.success(language === "ar" ? "تم تحميل التقرير!" : "Report downloaded!");
                  } catch (err) {
                    console.error(err);
                    toast.error(language === "ar" ? "فشل إنشاء التقرير" : "Failed to generate report");
                  }
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary"
              >
                <FileDown className="w-4 h-4 text-primary" />
              </button>
              <button onClick={reset} className="text-xs font-medium text-primary flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5" />
                {language === "ar" ? "إعادة" : language === "ku" ? "دووبارە" : "Rescan"}
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 py-4 space-y-5">
          {/* Personalized greeting */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-4 border border-primary/10">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/20 flex-shrink-0 flex items-center justify-center">
              {capturedImage ? <img src={capturedImage} alt="" className="w-full h-full object-cover" /> : <Scan className="w-5 h-5 text-primary" />}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                {language === "ar" ? `مرحباً ${user.user_metadata?.full_name || ''}، إليك تقرير بشرتك` : `Hey ${user.user_metadata?.full_name || 'there'}, here's your skin report`}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {language === "ar" ? "تحليل ELARA AI المتقدم" : "Analyzed by ELARA AI · "}{new Date().toLocaleDateString()}
              </p>
            </div>
          </motion.div>

          {/* Overall Score */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-3xl border border-border/50 shadow-premium p-6 text-center">
            <div className="relative inline-flex items-center justify-center">
              <ScoreRing score={analysis.overall_score} size={120} label="" color={getScoreColor(analysis.overall_score)} />
            </div>
            <h2 className="text-lg font-display font-black text-foreground mt-3">
              {language === "ar" ? "صحة البشرة العامة" : language === "ku" ? "تەندروستیی گشتیی پێست" : "Overall Skin Health"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 capitalize">
              {language === "ar" ? "نوع البشرة: " : language === "ku" ? "جۆری پێست: " : "Skin Type: "}
              <span className="font-semibold text-foreground">{analysis.skin_type}</span>
            </p>
            {analysis.summary && (
              <div className="mt-3 bg-secondary/50 rounded-xl p-3">
                <p className="text-[11px] text-muted-foreground leading-relaxed italic">"{analysis.summary}"</p>
              </div>
            )}
          </motion.div>

          {/* Detailed Scores */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border/50 shadow-premium p-5">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              {language === "ar" ? "التحليل التفصيلي" : language === "ku" ? "شیکردنەوەی وردەکاری" : "Detailed Breakdown"}
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <div className="relative flex flex-col items-center">
                <ScoreRing score={analysis.hydration_score} size={64} label={language === "ar" ? "ترطيب" : language === "ku" ? "شێداری" : "Hydration"} color={getScoreColor(analysis.hydration_score)} />
              </div>
              <div className="relative flex flex-col items-center">
                <ScoreRing score={analysis.elasticity_score} size={64} label={language === "ar" ? "مرونة" : language === "ku" ? "نەرمی" : "Elasticity"} color={getScoreColor(analysis.elasticity_score)} />
              </div>
              <div className="relative flex flex-col items-center">
                <ScoreRing score={analysis.clarity_score} size={64} label={language === "ar" ? "صفاء" : language === "ku" ? "ڕوونی" : "Clarity"} color={getScoreColor(analysis.clarity_score)} />
              </div>
              <div className="relative flex flex-col items-center">
                <ScoreRing score={analysis.texture_score} size={64} label={language === "ar" ? "ملمس" : language === "ku" ? "ڕوکەش" : "Texture"} color={getScoreColor(analysis.texture_score)} />
              </div>
            </div>
          </motion.div>

          {/* Common Concerns Rating */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-2xl border border-border/50 shadow-premium p-5">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              {language === "ar" ? "تقييم المشاكل الشائعة" : language === "ku" ? "هەڵسەنگاندنی کێشە باوەکان" : "Common Concerns Rating"}
            </h3>
            <div className="space-y-3">
              {[
                { label: language === "ar" ? "حب الشباب" : "Acne", score: analysis.acne_score ?? 0, emoji: "🔴" },
                { label: language === "ar" ? "تصبغات / بقع داكنة" : "Pigmentation", score: analysis.pigmentation_score ?? 0, emoji: "🟤" },
                { label: language === "ar" ? "جفاف البشرة" : "Dryness", score: analysis.dryness_score ?? 0, emoji: "🏜️" },
                { label: language === "ar" ? "دهون زائدة" : "Oiliness", score: analysis.oiliness_score ?? 0, emoji: "💧" },
                { label: language === "ar" ? "المسام الواسعة" : "Pores", score: analysis.pores_score ?? 0, emoji: "🔵" },
                { label: language === "ar" ? "هالات سوداء" : "Dark Circles", score: analysis.dark_circles_score ?? 0, emoji: "👁️" },
              ].map((item, i) => {
                const barColor = item.score >= 80 ? "bg-green-500" : item.score >= 60 ? "bg-amber-500" : "bg-red-500";
                const statusText = item.score >= 80 
                  ? (language === "ar" ? "ممتاز" : "Great") 
                  : item.score >= 60 
                    ? (language === "ar" ? "معتدل" : "Moderate") 
                    : (language === "ar" ? "يحتاج عناية" : "Needs Care");
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.06 }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <span>{item.emoji}</span> {item.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-medium ${item.score >= 80 ? 'text-green-600' : item.score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                          {statusText}
                        </span>
                        <span className="text-xs font-bold text-foreground w-7 text-right">{item.score}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.score}%` }}
                        transition={{ duration: 1, delay: 0.3 + i * 0.06, ease: "easeOut" }}
                        className={`h-full rounded-full ${barColor}`}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Problems Detected */}
          {analysis.problems?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-border/50 shadow-premium p-5">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                {language === "ar" ? "المشاكل المكتشفة" : language === "ku" ? "کێشەکانی دۆزراوە" : "Concerns Detected"}
                <span className="ml-auto text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-medium">{analysis.problems.length} {language === "ar" ? "مشكلة" : "found"}</span>
              </h3>
              <div className="space-y-3">
                {analysis.problems.map((p, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="bg-secondary/50 rounded-xl p-3.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h4 className="text-xs font-bold text-foreground">{p.name}</h4>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getSeverityColor(p.severity)}`}>{p.severity}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{p.description}</p>
                    {p.affected_areas && (
                      <p className="text-[10px] text-muted-foreground/70 mt-1">📍 {p.affected_areas}</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Personalized Routine */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl border border-border/50 shadow-premium p-5">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {language === "ar" ? "روتينك المخصص من ELARA" : language === "ku" ? "ڕووتینی تایبەتی تۆ لە ELARA" : "Your ELARA-Personalized Routine"}
            </h3>

            {/* Morning */}
            <button onClick={() => setExpandedRoutine(expandedRoutine === "morning" ? null : "morning")} className="w-full flex items-center justify-between py-2.5 border-b border-border/30">
              <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Sun className="w-4 h-4 text-amber-500" />
                {language === "ar" ? "روتين الصباح" : language === "ku" ? "ڕووتینی بەیانی" : "Morning Routine"}
              </span>
              {expandedRoutine === "morning" ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            <AnimatePresence>
              {expandedRoutine === "morning" && analysis.routine.morning && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="py-3 space-y-2.5">
                    {analysis.routine.morning.map((s, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-primary">{s.step}</span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{s.action}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{s.details}</p>
                          {s.why && <p className="text-[10px] text-primary/80 mt-0.5 italic">💡 {s.why}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Evening */}
            <button onClick={() => setExpandedRoutine(expandedRoutine === "evening" ? null : "evening")} className="w-full flex items-center justify-between py-2.5 border-b border-border/30">
              <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Moon className="w-4 h-4 text-violet-400" />
                {language === "ar" ? "روتين المساء" : language === "ku" ? "ڕووتینی ئێوارە" : "Evening Routine"}
              </span>
              {expandedRoutine === "evening" ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            <AnimatePresence>
              {expandedRoutine === "evening" && analysis.routine.evening && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="py-3 space-y-2.5">
                    {analysis.routine.evening.map((s, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-accent-foreground">{s.step}</span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{s.action}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{s.details}</p>
                          {s.why && <p className="text-[10px] text-primary/80 mt-0.5 italic">💡 {s.why}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Weekly */}
            {analysis.routine.weekly && analysis.routine.weekly.length > 0 && (
              <>
                <button onClick={() => setExpandedRoutine(expandedRoutine === "weekly" ? null : "weekly")} className="w-full flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Calendar className="w-4 h-4 text-primary" />
                    {language === "ar" ? "أسبوعي" : language === "ku" ? "هەفتانە" : "Weekly"}
                  </span>
                  {expandedRoutine === "weekly" ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                <AnimatePresence>
                  {expandedRoutine === "weekly" && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="py-3 space-y-2.5">
                        {analysis.routine.weekly.map((s, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-[10px] font-bold text-primary">{s.step}</span>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">{s.action}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{s.details}</p>
                              {s.frequency && <p className="text-[10px] text-primary/80 mt-0.5">📅 {s.frequency}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>

          {/* Recommended Products */}
          {products.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card rounded-2xl border border-border/50 shadow-premium p-5">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-primary" />
                {language === "ar" ? "منتجات ELARA الموصى بها لبشرتك" : language === "ku" ? "بەرهەمی ELARA ی پێشنیارکراو بۆ پێستت" : "ELARA Products Matched for You"}
              </h3>
              <div className="space-y-2">
                {products.map(p => (
                  <Link key={p.id} to={`/product/${p.slug}`} className="flex items-center gap-3 p-2.5 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-background flex-shrink-0">
                      {p.product_images?.[0]?.image_url ? (
                        <img src={p.product_images[0].image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-muted-foreground" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{getProductTitle(p)}</p>
                      <p className="text-[11px] text-primary font-bold mt-0.5">{p.price.toLocaleString()} IQD</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 rtl:rotate-180" />
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* Lifestyle Tips */}
          {analysis.lifestyle_tips?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 rounded-2xl border border-primary/20 p-5">
              <h3 className="text-sm font-bold text-foreground mb-3">
                {language === "ar" ? "نصائح يومية" : language === "ku" ? "ئامۆژگاری ڕۆژانە" : "Lifestyle Tips"}
              </h3>
              <ul className="space-y-2">
                {analysis.lifestyle_tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="text-primary mt-0.5">✦</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Share & saved notice */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="space-y-3">
            <button
              onClick={async () => {
                try {
                  toast.info(language === "ar" ? "جاري إنشاء التقرير..." : "Generating report...");
                  const blob = await generateSkinReportPdf(analysis as any, user?.user_metadata?.full_name || "", language);
                  const fileName = `ELARA-Skin-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
                  await savePdfBlob(blob, fileName);
                  toast.success(language === "ar" ? "تم تحميل التقرير!" : "Report downloaded!");
                } catch (err) {
                  console.error(err);
                  toast.error(language === "ar" ? "فشل إنشاء التقرير" : "Failed to generate report");
                }
              }}
              className="w-full py-3 bg-gradient-to-r from-rose-500 via-primary to-violet-500 text-white font-semibold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg"
            >
              <FileDown className="w-4 h-4" />
              {language === "ar" ? "تحميل التقرير PDF" : language === "ku" ? "داگرتنی ڕاپۆرت PDF" : "Download Report as PDF"}
            </button>
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 text-center">
              <Clock className="w-3 h-3" />
              {language === "ar" ? "تم حفظ هذا التقرير تلقائياً في سجلك" : "This report has been automatically saved to your history"}
            </p>
          </motion.div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return null;
}
