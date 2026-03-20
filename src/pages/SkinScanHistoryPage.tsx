import { useState } from "react";
import { ArrowLeft, Scan, Droplets, Eye, Fingerprint, Zap, Calendar, GitCompareArrows, TrendingUp, TrendingDown, Minus, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/layout/BottomNav";

interface ScanRow {
  id: string;
  overall_score: number;
  skin_type: string | null;
  hydration_score: number | null;
  elasticity_score: number | null;
  clarity_score: number | null;
  texture_score: number | null;
  problems: any;
  created_at: string;
}

const DiffBadge = ({ diff, size = "sm" }: { diff: number; size?: "sm" | "lg" }) => {
  const cls = size === "lg" ? "text-sm px-2.5 py-1" : "text-[10px] px-1.5 py-0.5";
  if (diff > 0) return <span className={`inline-flex items-center gap-0.5 ${cls} rounded-full bg-green-500/10 text-green-600 font-bold`}><TrendingUp className={size === "lg" ? "w-3.5 h-3.5" : "w-3 h-3"} />+{diff}</span>;
  if (diff < 0) return <span className={`inline-flex items-center gap-0.5 ${cls} rounded-full bg-red-500/10 text-red-500 font-bold`}><TrendingDown className={size === "lg" ? "w-3.5 h-3.5" : "w-3 h-3"} />{diff}</span>;
  return <span className={`inline-flex items-center gap-0.5 ${cls} rounded-full bg-secondary text-muted-foreground font-medium`}><Minus className={size === "lg" ? "w-3.5 h-3.5" : "w-3 h-3"} />0</span>;
};

const SkinScanHistoryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const isRtl = language === "ar" || language === "ku";
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const { data: scans = [], isLoading } = useQuery({
    queryKey: ["skin-scan-history", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("skin_analyses")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data || []) as ScanRow[];
    },
    enabled: !!user,
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const handleCompare = () => {
    if (selected.length === 2) setShowComparison(true);
  };

  const olderScan = scans.find(s => s.id === selected[0]);
  const newerScan = scans.find(s => s.id === selected[1]);
  // Sort so older is first
  const [scanA, scanB] = olderScan && newerScan
    ? new Date(olderScan.created_at) <= new Date(newerScan.created_at) ? [olderScan, newerScan] : [newerScan, olderScan]
    : [olderScan, newerScan];

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24" dir={isRtl ? "rtl" : "ltr"}>
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/30" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => showComparison ? setShowComparison(false) : navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary">
              <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            </button>
            <div className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-display font-bold">
                {showComparison
                  ? (language === "ar" ? "المقارنة" : "Comparison")
                  : (language === "ar" ? "سجل تحليلات البشرة" : "Scan History")}
              </h1>
            </div>
          </div>
          {!showComparison && scans.length >= 2 && (
            <button
              onClick={() => { setCompareMode(!compareMode); setSelected([]); }}
              className={`text-xs font-medium flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors ${compareMode ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
            >
              <GitCompareArrows className="w-3.5 h-3.5" />
              {language === "ar" ? "قارن" : "Compare"}
            </button>
          )}
        </div>
      </header>

      {/* ─── COMPARISON VIEW ─── */}
      <AnimatePresence>
        {showComparison && scanA && scanB && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-lg mx-auto px-4 py-4 space-y-4"
          >
            {/* Timeline header */}
            <div className="flex items-center justify-between bg-card rounded-2xl border border-border/50 shadow-premium p-4">
              <div className="text-center flex-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
                  {language === "ar" ? "السابق" : "Before"}
                </p>
                <p className="text-xs font-semibold text-foreground">
                  {new Date(scanA.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="flex flex-col items-center px-4">
                <GitCompareArrows className="w-5 h-5 text-primary" />
                <p className="text-[9px] text-muted-foreground mt-1">
                  {Math.ceil((new Date(scanB.created_at).getTime() - new Date(scanA.created_at).getTime()) / (1000 * 60 * 60 * 24))} {language === "ar" ? "يوم" : "days"}
                </p>
              </div>
              <div className="text-center flex-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
                  {language === "ar" ? "الأحدث" : "After"}
                </p>
                <p className="text-xs font-semibold text-foreground">
                  {new Date(scanB.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Overall score comparison */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border/50 shadow-premium p-5 text-center">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
                {language === "ar" ? "صحة البشرة العامة" : "Overall Skin Health"}
              </h3>
              <div className="flex items-center justify-center gap-6">
                <div>
                  <p className={`text-4xl font-display font-black ${getScoreColor(scanA.overall_score)}`}>{scanA.overall_score}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{language === "ar" ? "السابق" : "Before"}</p>
                </div>
                <div className="flex flex-col items-center">
                  <DiffBadge diff={scanB.overall_score - scanA.overall_score} size="lg" />
                </div>
                <div>
                  <p className={`text-4xl font-display font-black ${getScoreColor(scanB.overall_score)}`}>{scanB.overall_score}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{language === "ar" ? "الأحدث" : "After"}</p>
                </div>
              </div>
              {/* Verdict */}
              <div className="mt-4">
                {scanB.overall_score > scanA.overall_score ? (
                  <p className="text-xs text-green-600 font-semibold flex items-center justify-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {language === "ar" ? "بشرتك تتحسن! استمر!" : "Your skin is improving! Keep it up!"}
                  </p>
                ) : scanB.overall_score < scanA.overall_score ? (
                  <p className="text-xs text-amber-500 font-semibold flex items-center justify-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    {language === "ar" ? "بشرتك تحتاج اهتمام أكثر" : "Your skin needs more attention"}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground font-semibold flex items-center justify-center gap-1">
                    <Minus className="w-3.5 h-3.5" />
                    {language === "ar" ? "بشرتك مستقرة" : "Your skin is stable"}
                  </p>
                )}
              </div>
            </motion.div>

            {/* Detailed comparison */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-border/50 shadow-premium p-5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
                {language === "ar" ? "مقارنة تفصيلية" : "Detailed Comparison"}
              </h3>
              <div className="space-y-3">
                {[
                  { icon: Droplets, label: language === "ar" ? "ترطيب" : "Hydration", a: scanA.hydration_score || 0, b: scanB.hydration_score || 0 },
                  { icon: Zap, label: language === "ar" ? "مرونة" : "Elasticity", a: scanA.elasticity_score || 0, b: scanB.elasticity_score || 0 },
                  { icon: Eye, label: language === "ar" ? "صفاء" : "Clarity", a: scanA.clarity_score || 0, b: scanB.clarity_score || 0 },
                  { icon: Fingerprint, label: language === "ar" ? "ملمس" : "Texture", a: scanA.texture_score || 0, b: scanB.texture_score || 0 },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3"
                  >
                    <item.icon className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-xs font-medium text-foreground w-16">{item.label}</span>
                    <span className={`text-sm font-bold w-8 text-center ${getScoreColor(item.a)}`}>{item.a}</span>
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.a}%` }}
                        transition={{ duration: 0.8, delay: 0.4 + i * 0.08 }}
                        className="absolute top-0 left-0 h-full bg-muted-foreground/30 rounded-full"
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.b}%` }}
                        transition={{ duration: 0.8, delay: 0.5 + i * 0.08 }}
                        className="absolute top-0 left-0 h-full bg-primary rounded-full"
                      />
                    </div>
                    <span className={`text-sm font-bold w-8 text-center ${getScoreColor(item.b)}`}>{item.b}</span>
                    <DiffBadge diff={item.b - item.a} />
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Concerns comparison */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card rounded-2xl border border-border/50 shadow-premium p-5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
                {language === "ar" ? "المشاكل" : "Concerns"}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-2">{language === "ar" ? "السابق" : "Before"}</p>
                  {Array.isArray(scanA.problems) && (scanA.problems as any[]).length > 0 ? (
                    (scanA.problems as any[]).map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 mb-1.5">
                        <X className="w-3 h-3 text-red-400 flex-shrink-0" />
                        <span className="text-[11px] text-foreground">{p.name}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-muted-foreground">—</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-2">{language === "ar" ? "الأحدث" : "After"}</p>
                  {Array.isArray(scanB.problems) && (scanB.problems as any[]).length > 0 ? (
                    (scanB.problems as any[]).map((p: any, i: number) => {
                      const wasInA = Array.isArray(scanA.problems) && (scanA.problems as any[]).some((ap: any) => ap.name === p.name);
                      return (
                        <div key={i} className="flex items-center gap-1.5 mb-1.5">
                          {wasInA ? <Minus className="w-3 h-3 text-amber-400 flex-shrink-0" /> : <X className="w-3 h-3 text-red-400 flex-shrink-0" />}
                          <span className="text-[11px] text-foreground">{p.name}</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-[11px] text-muted-foreground">—</p>
                  )}
                  {/* Resolved concerns */}
                  {Array.isArray(scanA.problems) && (scanA.problems as any[]).filter((ap: any) =>
                    !Array.isArray(scanB.problems) || !(scanB.problems as any[]).some((bp: any) => bp.name === ap.name)
                  ).map((p: any, i: number) => (
                    <div key={`resolved-${i}`} className="flex items-center gap-1.5 mb-1.5">
                      <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                      <span className="text-[11px] text-green-600 line-through">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <button
              onClick={() => { setShowComparison(false); setCompareMode(false); setSelected([]); }}
              className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-2xl text-sm"
            >
              {language === "ar" ? "رجوع للسجل" : "Back to History"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HISTORY LIST ─── */}
      {!showComparison && (
        <div className="max-w-lg mx-auto px-4 py-4">
          {/* Compare mode banner */}
          <AnimatePresence>
            {compareMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-4"
              >
                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 text-center">
                  <p className="text-xs font-medium text-foreground mb-1">
                    {language === "ar" ? "اختر تحليلين للمقارنة" : "Select 2 scans to compare"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {selected.length}/2 {language === "ar" ? "محدد" : "selected"}
                  </p>
                  {selected.length === 2 && (
                    <motion.button
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      onClick={handleCompare}
                      className="mt-3 px-6 py-2.5 bg-gradient-to-r from-rose-500 via-primary to-violet-500 text-white font-semibold rounded-xl text-xs shadow-lg"
                    >
                      <GitCompareArrows className="w-3.5 h-3.5 inline mr-1.5" />
                      {language === "ar" ? "قارن الآن" : "Compare Now"}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : scans.length === 0 ? (
            <div className="text-center py-20">
              <Scan className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "لم تقم بأي تحليل بعد" : "No scans yet. Try your first AI skin analysis!"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {scans.map((scan, idx) => {
                const isSelected = selected.includes(scan.id);
                return (
                  <motion.div
                    key={scan.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => compareMode && toggleSelect(scan.id)}
                    className={`bg-card rounded-2xl border shadow-premium p-5 transition-all ${
                      compareMode ? 'cursor-pointer' : ''
                    } ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border/50'}`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {compareMode && (
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                        )}
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(scan.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                        {scan.skin_type}
                      </span>
                    </div>

                    {/* Overall score */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`text-3xl font-display font-black ${getScoreColor(scan.overall_score)}`}>
                        {scan.overall_score}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {language === "ar" ? "صحة البشرة العامة" : "Overall Skin Health"}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {(scan.overall_score ?? 0) >= 80 ? (language === "ar" ? "ممتاز" : "Excellent") : (scan.overall_score ?? 0) >= 60 ? (language === "ar" ? "جيد" : "Good") : (language === "ar" ? "يحتاج اهتمام" : "Needs Attention")}
                        </p>
                      </div>
                    </div>

                    {/* Score grid */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { icon: Droplets, label: language === "ar" ? "ترطيب" : "Hydration", score: scan.hydration_score },
                        { icon: Zap, label: language === "ar" ? "مرونة" : "Elasticity", score: scan.elasticity_score },
                        { icon: Eye, label: language === "ar" ? "صفاء" : "Clarity", score: scan.clarity_score },
                        { icon: Fingerprint, label: language === "ar" ? "ملمس" : "Texture", score: scan.texture_score },
                      ].map((item, i) => (
                        <div key={i} className="bg-secondary/50 rounded-xl p-2.5 text-center">
                          <item.icon className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
                          <p className={`text-sm font-bold ${getScoreColor(item.score || 0)}`}>{item.score || 0}</p>
                          <p className="text-[9px] text-muted-foreground">{item.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Problems count */}
                    {scan.problems && Array.isArray(scan.problems) && (scan.problems as any[]).length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {(scan.problems as any[]).length} {language === "ar" ? "مشكلة مكتشفة" : "concerns detected"}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <BottomNav />
    </div>
  );
};

export default SkinScanHistoryPage;
