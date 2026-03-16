import { ArrowLeft, Scan, Droplets, Eye, Fingerprint, Zap, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import BottomNav from "@/components/layout/BottomNav";

const SkinScanHistoryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isRtl = language === "ar" || language === "ku";

  const { data: scans = [], isLoading } = useQuery({
    queryKey: ["skin-scan-history", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("skin_analyses")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24" dir={isRtl ? "rtl" : "ltr"}>
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/30" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary">
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <div className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-display font-bold">
              {language === "ar" ? "سجل تحليلات البشرة" : language === "ku" ? "مێژووی شیکردنەوەی پێست" : "Scan History"}
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
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
            {scans.map((scan, idx) => (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-card rounded-2xl border border-border/50 shadow-premium p-5"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
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
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default SkinScanHistoryPage;
