import { useState } from "react";
import { Star, Sparkles, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useLanguage } from "@/i18n/LanguageContext";

interface OrderRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  userId: string;
  orderNumber: string;
}

interface RatingCategory {
  key: string;
  labelKey: string;
  icon: string;
  value: number;
}

const StarRating = ({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md";
}) => {
  const [hover, setHover] = useState(0);
  const starSize = size === "sm" ? "w-6 h-6" : "w-8 h-8";

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            className={`${starSize} transition-colors ${
              star <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const OrderRatingDialog = ({
  open,
  onOpenChange,
  orderId,
  userId,
  orderNumber,
}: OrderRatingDialogProps) => {
  const { t } = useLanguage();
  const [step, setStep] = useState<"rate" | "success">("rate");
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState("");

  const [categories, setCategories] = useState<RatingCategory[]>([
    { key: "quality", labelKey: "rating.quality", icon: "✨", value: 0 },
    { key: "delivery_time", labelKey: "rating.deliveryTime", icon: "⚡", value: 0 },
    { key: "expectation", labelKey: "rating.expectation", icon: "🎯", value: 0 },
    { key: "service", labelKey: "rating.service", icon: "💎", value: 0 },
    { key: "price", labelKey: "rating.price", icon: "💰", value: 0 },
  ]);

  const overallAvg = categories.reduce((sum, c) => sum + c.value, 0) / categories.length;
  const [overallRating, setOverallRating] = useState(0);
  const allRated = categories.every((c) => c.value > 0) && overallRating > 0;

  const updateCategory = (key: string, value: number) => {
    setCategories((prev) =>
      prev.map((c) => (c.key === key ? { ...c, value } : c))
    );
  };

  const handleSubmit = async () => {
    if (!allRated) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("order_ratings").insert({
        order_id: orderId,
        user_id: userId,
        quality_rating: categories.find((c) => c.key === "quality")!.value,
        delivery_time_rating: categories.find((c) => c.key === "delivery_time")!.value,
        expectation_rating: categories.find((c) => c.key === "expectation")!.value,
        service_rating: categories.find((c) => c.key === "service")!.value,
        price_rating: categories.find((c) => c.key === "price")!.value,
        overall_rating: overallRating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
      setStep("success");
      toast.success(t("rating.thankYou") || "Thank you for your feedback!");
    } catch (e: any) {
      if (e.message?.includes("duplicate key") || e.code === "23505") {
        toast.info(t("rating.alreadyRated") || "You've already rated this order");
        onOpenChange(false);
      } else {
        toast.error(e.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setStep("rate");
      setComment("");
      setOverallRating(0);
      setCategories((prev) => prev.map((c) => ({ ...c, value: 0 })));
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="rounded-2xl max-w-md mx-auto max-h-[90vh] overflow-y-auto p-0">
        <AnimatePresence mode="wait">
          {step === "rate" ? (
            <motion.div
              key="rate"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <DialogHeader className="mb-5">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-primary" />
                  </div>
                </div>
                <DialogTitle className="text-center text-lg font-display">
                  {t("rating.title") || "Rate Your Order"}
                </DialogTitle>
                <DialogDescription className="text-center text-sm">
                  {t("rating.subtitle") || "How was your experience with order"}{" "}
                  <span className="font-mono font-semibold text-foreground">
                    #{orderNumber}
                  </span>
                  ?
                </DialogDescription>
              </DialogHeader>

              {/* Category ratings */}
              <div className="space-y-4 mb-6">
                {categories.map((cat, idx) => (
                  <motion.div
                    key={cat.key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{cat.icon}</span>
                      <span className="text-sm font-medium text-foreground">
                        {t(cat.labelKey) || cat.key}
                      </span>
                    </div>
                    <StarRating
                      value={cat.value}
                      onChange={(v) => updateCategory(cat.key, v)}
                      size="sm"
                    />
                  </motion.div>
                ))}
              </div>

              {/* Overall rating */}
              <div className="border-t border-border/50 pt-5 mb-5">
                <p className="text-sm font-bold text-foreground text-center mb-3">
                  {t("rating.overall") || "Overall Experience"}
                </p>
                <div className="flex justify-center">
                  <StarRating
                    value={overallRating}
                    onChange={setOverallRating}
                    size="md"
                  />
                </div>
                {overallRating > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-xs text-muted-foreground mt-2"
                  >
                    {overallRating <= 2
                      ? t("rating.poor") || "We'll do better"
                      : overallRating <= 3
                      ? t("rating.average") || "Not bad"
                      : overallRating <= 4
                      ? t("rating.good") || "Great!"
                      : t("rating.excellent") || "Excellent! 🎉"}
                  </motion.p>
                )}
              </div>

              {/* Comment */}
              <Textarea
                placeholder={t("rating.commentPlaceholder") || "Share your thoughts (optional)..."}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="rounded-xl resize-none h-20 text-sm mb-5"
              />

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={!allRated || submitting}
                className="w-full h-12 rounded-xl font-semibold text-sm"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                    {t("rating.submit") || "Submit Rating"}
                  </>
                )}
              </Button>

              <button
                onClick={handleClose}
                className="w-full text-center text-xs text-muted-foreground mt-3 hover:text-foreground transition-colors"
              >
                {t("rating.skipForNow") || "Skip for now"}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>
              <h3 className="text-lg font-display font-bold text-foreground mb-2">
                {t("rating.thankYouTitle") || "Thank You!"}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {t("rating.thankYouDesc") || "Your feedback helps us improve our service and deliver a better experience."}
              </p>
              <Button onClick={handleClose} className="rounded-xl h-11 px-8">
                {t("common.done") || "Done"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default OrderRatingDialog;
