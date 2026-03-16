import { motion } from "framer-motion";
import { Sparkles, Globe, Users, ShieldCheck, Heart, ArrowRight, Gift, Truck, BrainCircuit, MessageCircle, Scan } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "@/components/layout/PageShell";
import elaraBanner from "@/assets/elara-banner.webp";
import { useLanguage } from "@/i18n/LanguageContext";

const content = {
  en: {
    pageTitle: "About ELARA",
    heroTitle: ["Welcome to ", "ELARA", ", Iraq's first smart health & beauty platform"],
    mission: [
      ["We're not just an online store — we're a ", "new way to care for yourself", "."],
      "ELARA is Iraq's first health & beauty platform built to bring you trusted products, powerful tools, and a seamless experience — all in one place.",
      ["From skincare and cosmetics to wellness devices and supplements, we handpick everything with one promise: ", "100% authenticity, zero compromise", "."],
      "We know what it's like to search for original products, fair prices, fast delivery, and good service in healthcare and beauty — so we built ELARA to deliver all that. Every product is verified. Every order is tracked. Every experience is made for you.",
    ],
    stats: [
      { value: "100%", label: "Verified Brands" },
      { value: "3,000+", label: "Products" },
      { value: "250+", label: "Brands" },
    ],
    aiSection: {
      badge: "🇮🇶 First of its kind in Iraq",
      title: "Meet ELARA AI",
      subtitle: "Your personal AI beauty & health consultant — built right into the platform.",
      desc: "ELARA AI is the first AI-powered beauty assistant in Iraq. It understands your skin, your concerns, and your goals — then gives you expert-level advice, personalized routines, and smart product recommendations in Arabic, Kurdish, and English.",
      features: [
        { icon: "brain", label: "AI Beauty Consultant", desc: "Get personalized skincare & grooming advice 24/7" },
        { icon: "scan", label: "Smart Skin Analysis", desc: "AI-powered analysis tailored to your skin type & concerns" },
        { icon: "chat", label: "Ask Anything", desc: "Chat naturally about products, routines, or ingredients" },
      ],
      cta: "Try ELARA AI",
    },
    diffTitle: "What makes ELARA different?",
    diffs: [
      { title: "Multilingual & Local", desc: "Arabic, Kurdish, and English — we speak your language" },
      { title: "Rewards & Loyalty", desc: "Earn points on every order and redeem exclusive rewards with ELARA Rewards" },
      { title: "Only Original", desc: "Every product is verified authentic — 100% genuine, zero compromise" },
      { title: "Fast & Reliable", desc: "Order confirmation emails, real-time tracking, and delivery across Iraq" },
    ],
    closing: "We're here to simplify your beauty journey — and make self-care a daily joy.",
    chooseTitle: "Choose ELARA",
    reasons: [
      "Because your time matters.",
      "Because your skin deserves the real deal.",
      "Because your health starts with what you choose — and we make choosing easier.",
    ],
    contactQ: "Have questions? Reach out anytime.",
    contactCTA: "Contact us — info@elarastore.co",
  },
  ar: {
    pageTitle: "عن إيلارا",
    heroTitle: ["مرحباً بك في ", "إيلارا", "، أول منصة ذكية للصحة والجمال في العراق"],
    mission: [
      ["إحنا مو بس متجر إلكتروني — إحنا ", "طريقة جديدة تهتم بنفسك", "."],
      "إيلارا هي أول منصة للصحة والجمال بالعراق، صُممت عشان توفرلك منتجات موثوقة، أدوات قوية، وتجربة سلسة — كلها بمكان واحد.",
      ["من العناية بالبشرة ومستحضرات التجميل إلى أجهزة العافية والمكملات، نختار كل شي بوعد واحد: ", "أصالة 100%، بدون تنازل", "."],
      "نعرف شلون تدور على منتجات أصلية، أسعار عادلة، توصيل سريع، وخدمة زينة بمجال الصحة والجمال — عشان جذي بنينا إيلارا. كل منتج موثق. كل طلب متابَع. كل تجربة مصممة إلك.",
    ],
    stats: [
      { value: "100%", label: "براندات موثقة" },
      { value: "+3,000", label: "منتج" },
      { value: "+250", label: "براند" },
    ],
    aiSection: {
      badge: "🇮🇶 الأول من نوعه في العراق",
      title: "تعرّف على إيلارا AI",
      subtitle: "مستشارك الشخصي للجمال والصحة بالذكاء الاصطناعي — مدمج داخل المنصة.",
      desc: "إيلارا AI هو أول مساعد جمال بالذكاء الاصطناعي في العراق. يفهم بشرتك، مخاوفك، وأهدافك — ويعطيك نصائح بمستوى خبير، روتينات مخصصة، وتوصيات ذكية بالعربي، الكردي، والإنگليزي.",
      features: [
        { icon: "brain", label: "مستشار جمال AI", desc: "نصائح مخصصة للعناية بالبشرة والعناية الشخصية ٢٤/٧" },
        { icon: "scan", label: "تحليل البشرة الذكي", desc: "تحليل بالذكاء الاصطناعي مخصص لنوع بشرتك ومخاوفك" },
        { icon: "chat", label: "اسأل أي شي", desc: "دردش بشكل طبيعي عن المنتجات، الروتينات، أو المكونات" },
      ],
      cta: "جرّب إيلارا AI",
    },
    diffTitle: "شنو يميّز إيلارا؟",
    diffs: [
      { title: "متعددة اللغات ومحلية", desc: "عربي، كردي، وإنگليزي — نحچي لغتك" },
      { title: "مكافآت وولاء", desc: "اكسب نقاط على كل طلب واستبدلها بمكافآت حصرية مع مكافآت إيلارا" },
      { title: "أصلي فقط", desc: "كل منتج موثق أصلي — 100% حقيقي، بدون تنازل" },
      { title: "سريع وموثوق", desc: "إيميلات تأكيد الطلب، متابعة مباشرة، وتوصيل بكل أنحاء العراق" },
    ],
    closing: "إحنا هنا نسهّل رحلة جمالك — ونخلي العناية بالنفس فرحة يومية.",
    chooseTitle: "اختار إيلارا",
    reasons: [
      "لأن وقتك يهم.",
      "لأن بشرتك تستاهل الأصلي.",
      "لأن صحتك تبدأ من اللي تختاره — وإحنا نسهّل عليك الاختيار.",
    ],
    contactQ: "عندك أسئلة؟ تواصل وياانا بأي وقت.",
    contactCTA: "تواصل وياانا — info@elarastore.co",
  },
  ku: {
    pageTitle: "دەربارەی ئێلارا",
    heroTitle: ["بەخێربێیت بۆ ", "ئێلارا", "، یەکەمین پلاتفۆرمی زیرەکی تەندروستی و جوانی عێراق"],
    mission: [
      ["ئێمە تەنها فرۆشگای ئۆنلاین نین — ئێمە ", "ڕێگایەکی نوێین بۆ گرنگیدان بە خۆت", "."],
      "ئێلارا یەکەمین پلاتفۆرمی تەندروستی و جوانییە لە عێراق، دروستکراوە بۆ ئەوەی بەرهەمی متمانەپێکراو، ئامرازی بەهێز، و ئەزموونێکی ئاسان پێشکەشت بکات — هەمووی لە شوێنێکدا.",
      ["لە چاودێری پێست و جوانکاری تا ئامێری تەندروستی و تەواوکەرەکان، هەمووی بە یەک بەڵێن هەڵدەبژێرین: ", "ئەسڵی 100%، بێ گوزەشت", "."],
      "ئێمە دەزانین چۆنە بگەڕێیت بۆ بەرهەمی ئەسڵی، نرخی دادپەروەرانە، گەیاندنی خێرا، و خزمەتگوزاریی باش — بۆیە ئێلارامان دروستکرد. هەموو بەرهەمێک پشتڕاستکراوەتەوە. هەموو داواکارییەک بەدواداچووە. هەموو ئەزموونێک بۆ تۆ دروستکراوە.",
    ],
    stats: [
      { value: "100%", label: "براندی پشتڕاستکراو" },
      { value: "+3,000", label: "بەرهەم" },
      { value: "+250", label: "براند" },
    ],
    aiSection: {
      badge: "🇮🇶 یەکەمین لە جۆری خۆی لە عێراق",
      title: "ئێلارا AI بناسە",
      subtitle: "ڕاوێژکاری تایبەتی AIی جوانی و تەندروستیت — لەناو پلاتفۆرمەکە دروستکراوە.",
      desc: "ئێلارا AI یەکەمین یاریدەدەری جوانکارییە بە زیرەکی دەستکرد لە عێراق. پێستت، نیگەرانییەکانت، و ئامانجەکانت تێدەگات — پاشان ڕاوێژی پسپۆڕانە، ڕووتینی تایبەت، و پێشنیاری بەرهەمی زیرەک پێشکەشت دەکات بە عەرەبی، کوردی، و ئینگلیزی.",
      features: [
        { icon: "brain", label: "ڕاوێژکاری جوانی AI", desc: "ڕاوێژی تایبەت بۆ چاودێری پێست و خۆتاشین ٢٤/٧" },
        { icon: "scan", label: "شیکردنەوەی پێستی زیرەک", desc: "شیکردنەوە بە AI تایبەت بە جۆری پێست و نیگەرانییەکانت" },
        { icon: "chat", label: "هەرچییەک بپرسە", desc: "بە شێوەیەکی ئاسایی قسە بکە دەربارەی بەرهەم، ڕووتین، یان پێکهاتەکان" },
      ],
      cta: "ئێلارا AI تاقی بکەرەوە",
    },
    diffTitle: "چی ئێلارا جیاواز دەکات؟",
    diffs: [
      { title: "فرەزمان و خۆجێیی", desc: "عەرەبی، کوردی، و ئینگلیزی — بە زمانی تۆ قسە دەکەین" },
      { title: "خەڵات و وەفاداری", desc: "لە هەر داواکارییەکدا خاڵ بەدەستبهێنە و خەڵاتی تایبەت بگۆڕە لەگەڵ خەڵاتەکانی ئێلارا" },
      { title: "تەنها ئەسڵی", desc: "هەموو بەرهەمێک پشتڕاستکراو و ئەسڵییە — 100% ڕاستەقینە، بێ گوزەشت" },
      { title: "خێرا و متمانەپێکراو", desc: "ئیمەیڵی پشتڕاستکردنی داواکاری، شوێنکەوتنی ڕاستەوخۆ، و گەیاندن بۆ هەموو عێراق" },
    ],
    closing: "ئێمە لێرەین بۆ ئاسانکردنی گەشتی جوانیت — و ئەوەی چاودێری خۆت بکرێتە خۆشییەکی ڕۆژانە.",
    chooseTitle: "ئێلارا هەڵبژێرە",
    reasons: [
      "چونکە کاتت گرنگە.",
      "چونکە پێستت شایستەی ئەسڵییە.",
      "چونکە تەندروستیت لە هەڵبژاردنت دەستپێدەکات — و ئێمە هەڵبژاردن ئاسانتر دەکەین.",
    ],
    contactQ: "پرسیارت هەیە؟ لە هەر کاتێکدا پەیوەندیمان پێوە بکە.",
    contactCTA: "پەیوەندیمان پێوە بکە — info@elarastore.co",
  },
};

const diffIcons = [Globe, Heart, ShieldCheck, Truck];

const aiFeatureIcons = { brain: BrainCircuit, scan: Scan, chat: MessageCircle };

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

export default function AboutPage() {
  const { language } = useLanguage();
  const c = content[language];

  return (
    <PageShell title={c.pageTitle} backTo="/profile">
      <div className="max-w-2xl mx-auto px-4 md:px-6 pb-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mt-6 rounded-3xl overflow-hidden relative bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border/50"
        >
          <img src={elaraBanner} alt="ELARA delivery" className="w-full h-48 md:h-64 object-cover object-center" />
          <div className="p-6 md:p-8">
            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground leading-snug">
              {c.heroTitle[0]}<span className="text-primary">{c.heroTitle[1]}</span>{c.heroTitle[2]}
            </h1>
          </div>
        </motion.div>

        {/* Mission */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mt-8 space-y-4 text-sm md:text-base text-muted-foreground leading-relaxed"
        >
          {c.mission.map((para, i) =>
            Array.isArray(para) ? (
              <p key={i}>
                {para[0]}<span className={i === 2 ? "text-primary font-semibold" : "text-foreground font-medium"}>{para[1]}</span>{para[2]}
              </p>
            ) : (
              <p key={i}>{para}</p>
            )
          )}
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }} className="mt-10 grid grid-cols-3 gap-3">
          {c.stats.map((s) => (
            <div key={s.label} className="text-center py-5 rounded-2xl bg-card border border-border shadow-premium">
              <p className="text-2xl md:text-3xl font-display font-black text-primary">{s.value}</p>
              <p className="text-[11px] md:text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Differentiators */}
        <div className="mt-12">
          <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-lg md:text-xl font-display font-bold text-foreground mb-5">
            {c.diffTitle}
          </motion.h2>
          <div className="space-y-3">
            {c.diffs.map((d, i) => {
              const Icon = diffIcons[i];
              return (
                <motion.div key={i} custom={i} initial="hidden" animate="visible" variants={fadeUp} className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-premium">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{d.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{d.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Closing */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }} className="mt-12 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">{c.closing}</p>
        </motion.div>

        {/* Choose ELARA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }} className="mt-10 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20 p-6 md:p-8">
          <h2 className="text-lg md:text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            {c.chooseTitle}
          </h2>
          <ul className="space-y-3">
            {c.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0 rtl:rotate-180" />
                <span className="text-sm text-foreground leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Contact */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-10 text-center">
          <p className="text-xs text-muted-foreground">{c.contactQ}</p>
          <p className="text-xs text-primary font-semibold mt-1">{c.contactCTA}</p>
        </motion.div>
      </div>
    </PageShell>
  );
}
