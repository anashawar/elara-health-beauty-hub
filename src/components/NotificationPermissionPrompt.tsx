import { motion } from "framer-motion";
import { Bell, Gift, Sparkles, Tag, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

interface Props {
  onAllow: () => void;
  onSkip: () => void;
}

const PERKS = [
  { icon: Tag, color: "from-primary to-primary/70", label: { en: "Flash sales & exclusive deals", ar: "عروض حصرية وتخفيضات سريعة", ku: "داشکاندن و ئۆفەری تایبەت" } },
  { icon: Gift, color: "from-rose to-rose/70", label: { en: "New arrivals & restocks", ar: "وصول منتجات جديدة", ku: "کاڵا نوێکان و گەڕانەوەی ستۆک" } },
  { icon: Sparkles, color: "from-gold to-gold/70", label: { en: "Personalized beauty tips", ar: "نصائح جمال مخصصة لك", ku: "ئامۆژگاری جوانکاری تایبەت بە تۆ" } },
];

export default function NotificationPermissionPrompt({ onAllow, onSkip }: Props) {
  const { language } = useLanguage();
  const isRtl = language === "ar" || language === "ku";

  const title = { en: "Never miss a deal! 💜", ar: "لا تفوت أي عرض! 💜", ku: "هیچ ئۆفەرێک لەدەست مەدە! 💜" };
  const subtitle = {
    en: "Turn on notifications to get early access to exclusive offers and beauty tips",
    ar: "فعّل الإشعارات لتحصل على العروض الحصرية ونصائح الجمال أولاً",
    ku: "ئاگاداریەکان چالاک بکە بۆ وەرگرتنی ئۆفەر و ئامۆژگاری جوانکاری پێش هەموو کەس",
  };
  const allowText = { en: "Yes, notify me!", ar: "نعم، أرسل لي!", ku: "بەڵێ، ئاگادارم بکە!" };
  const skipText = { en: "Maybe later", ar: "لاحقاً", ku: "دواتر" };

  const t = (obj: Record<string, string>) => obj[language] || obj.en;

  return (
    <motion.div
      key="notif-prompt"
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-6 pt-2"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Hero bell animation */}
      <div className="flex flex-col items-center text-center">
        <motion.div
          className="relative w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-primary/20 via-accent/30 to-primary/10 flex items-center justify-center mb-5"
          animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
        >
          <Bell className="w-9 h-9 text-primary" />
          {/* Notification dot */}
          <motion.div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
          >
            <span className="text-[10px] font-bold text-destructive-foreground">3</span>
          </motion.div>
        </motion.div>

        <h1 className="text-2xl font-display font-bold text-foreground leading-tight">
          {t(title)}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-[280px] leading-relaxed">
          {t(subtitle)}
        </p>
      </div>

      {/* Perks list */}
      <div className="space-y-3">
        {PERKS.map((perk, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.12 }}
            className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-card border border-border/50 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${perk.color} flex items-center justify-center shrink-0`}>
              <perk.icon className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">{t(perk.label)}</span>
          </motion.div>
        ))}
      </div>

      {/* Fake notification preview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="relative mx-2 p-3.5 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 border border-primary/20"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <Tag className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground">
              {language === "ar" ? "🔥 تخفيض ٤٠٪ على المنتجات الكورية!" : language === "ku" ? "🔥 ٪٤٠ داشکاندن لە کاڵا کۆریاییەکان!" : "🔥 40% OFF Korean skincare today!"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {language === "ar" ? "ELARA · الآن" : language === "ku" ? "ELARA · ئێستا" : "ELARA · Just now"}
            </p>
          </div>
        </div>
        <div className="absolute -top-2 -right-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
          {language === "ar" ? "مثال" : language === "ku" ? "نموونە" : "Preview"}
        </div>
      </motion.div>

      {/* CTA buttons */}
      <div className="space-y-3 pt-1">
        <Button
          onClick={onAllow}
          className="w-full h-13 rounded-2xl text-sm font-semibold gap-2 shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90"
        >
          <Bell className="w-4 h-4" />
          {t(allowText)}
        </Button>

        <button
          onClick={onSkip}
          className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t(skipText)}
        </button>
      </div>
    </motion.div>
  );
}
