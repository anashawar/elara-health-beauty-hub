import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, MessageCircle, Sparkles, HelpCircle } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import { useLanguage } from "@/i18n/LanguageContext";

const content = {
  en: {
    pageTitle: "FAQ",
    badge: "FAQ's",
    heroTitle: "Let's answer your questions",
    heroSub: "Everything you need to know about ELARA",
    faqs: [
      { q: "What is ELARA?", a: "ELARA is Iraq's first digital platform for health & beauty shopping. From skincare to personal care and wellness products, everything is 100% original, delivered to your door." },
      { q: "How can I contact a pharmacist?", a: "You can chat with ELARA's licensed pharmacists for free via WhatsApp! Get expert advice before buying any product — safe, quick, and easy." },
      { q: "How can I pay for my order?", a: "We offer Cash on Delivery (COD) for all cities in Iraq. Soon, we'll launch online payment and wallet features inside the app." },
      { q: "When will I receive my order?", a: "Delivery time varies based on your city. Your estimated delivery will always appear clearly at checkout." },
      { q: "What kind of products are available on ELARA?", a: "ELARA offers skincare, cosmetics, body care, personal care, baby care, smart health devices, supplements, and more from top brands — no medicines are sold." },
      { q: "How much is the delivery fee?", a: "Delivery fees depend on your location. Orders above 50,000 IQD often qualify for free delivery — watch out for special promos!" },
      { q: "Are the products original?", a: "Yes. 100% of ELARA's products are authentic. We source directly from authorized distributors, and you can shop with total peace of mind." },
      { q: "Can I return or exchange a product?", a: "Yes, only in these cases:\n\n• If you receive the wrong product, and notify us within 48 hours (unopened).\n• If the item is damaged during delivery and reported with proof within 48 hours.\n\nAny other case will be reviewed by our support team and terms may apply." },
      { q: "Where do you deliver?", a: "We deliver across all major cities in Iraq — Baghdad, Najaf, Basra, Karbala, Mosul, Kirkuk, Erbil, Sulaymaniyah, Duhok, and more. More zones are being added regularly." },
    ],
    stillTitle: "Still Have a Question?",
    stillDesc: "If you cannot find an answer to your question in our FAQ, you can always contact us via WhatsApp. We will answer you shortly!",
    chatBtn: "Chat on WhatsApp",
  },
  ar: {
    pageTitle: "الأسئلة الشائعة",
    badge: "أسئلة شائعة",
    heroTitle: "خلينا نجاوبك على أسئلتك",
    heroSub: "كل شي تحتاج تعرفه عن إيلارا",
    faqs: [
      { q: "شنو إيلارا؟", a: "إيلارا هي أول منصة رقمية بالعراق للصحة والجمال. من العناية بالبشرة للعناية الشخصية ومنتجات العافية، كل شي أصلي 100% ويوصلك لباب بيتك." },
      { q: "شلون أتواصل ويه صيدلي؟", a: "تگدر تحچي ويه صيادلة إيلارا المرخصين مجاناً عبر واتساب! تحصل نصيحة خبير قبل ما تشتري أي منتج — آمن، سريع، وسهل." },
      { q: "شلون أدفع للطلب؟", a: "نوفر الدفع عند الاستلام (COD) لكل مدن العراق. قريباً، راح نطلق خدمات الدفع الإلكتروني والمحفظة داخل التطبيق." },
      { q: "متى يوصل طلبي؟", a: "وقت التوصيل يختلف حسب مدينتك. الوقت المتوقع راح يظهر بوضوح عند إتمام الطلب." },
      { q: "شنو نوع المنتجات المتوفرة؟", a: "إيلارا توفر عناية بالبشرة، مستحضرات تجميل، عناية بالجسم، عناية شخصية، عناية بالطفل، أجهزة صحية ذكية، مكملات، وأكثر من أفضل الماركات — ما نبيع أدوية." },
      { q: "شگد رسوم التوصيل؟", a: "رسوم التوصيل تعتمد على موقعك. الطلبات فوق 50,000 دينار عراقي غالباً مجانية التوصيل — تابع العروض الخاصة!" },
      { q: "هل المنتجات أصلية؟", a: "نعم. 100% من منتجات إيلارا أصلية. نتعامل مباشرة ويه الموزعين المعتمدين، وتگدر تتسوق براحة بال تامة." },
      { q: "أگدر أرجّع أو أبدّل منتج؟", a: "نعم، بس بهالحالات:\n\n• إذا استلمت منتج غلط، وبلّغتنا خلال 48 ساعة (بدون فتح).\n• إذا وصل المنتج تالف وبلّغت بدليل خلال 48 ساعة.\n\nأي حالة ثانية راح يراجعها فريق الدعم وممكن تنطبق شروط." },
      { q: "وين توصلون؟", a: "نوصل لكل المدن الرئيسية بالعراق — بغداد، النجف، البصرة، كربلاء، الموصل، كركوك، أربيل، السليمانية، دهوك، وأكثر. مناطق جديدة تنضاف باستمرار." },
    ],
    stillTitle: "لسه عندك سؤال؟",
    stillDesc: "إذا ما لگيت جواب سؤالك بالأسئلة الشائعة، تگدر دائماً تتواصل وياانا عبر واتساب. راح نجاوبك بأسرع وقت!",
    chatBtn: "تواصل عبر واتساب",
  },
  ku: {
    pageTitle: "پرسیارە باوەکان",
    badge: "پرسیارە باوەکان",
    heroTitle: "با وەڵامی پرسیارەکانت بدەینەوە",
    heroSub: "هەموو شتێک کە پێویستت بە زانینیەتی دەربارەی ئێلارا",
    faqs: [
      { q: "ئێلارا چییە؟", a: "ئێلارا یەکەمین پلاتفۆرمی دیجیتاڵی عێراقە بۆ کڕینی تەندروستی و جوانی. لە چاودێری پێست تا چاودێری کەسی و بەرهەمەکانی تەندروستی، هەمووی ئەسڵی 100% و دەگاتە بەردەم دەرگات." },
      { q: "چۆن پەیوەندی بە دەرمانسازەوە بکەم؟", a: "دەتوانیت بە ڕێگای واتساب بۆ بەلاش قسە لەگەڵ دەرمانسازە مۆڵەتدارەکانی ئێلارا بکەیت! ڕاوێژی پسپۆڕ وەربگرە پێش کڕینی هەر بەرهەمێک — سەلامەت، خێرا، و ئاسان." },
      { q: "چۆن پارەی داواکارییەکەم بدەم؟", a: "پارەدان لەکاتی وەرگرتن (COD) بۆ هەموو شارەکانی عێراق. بەم زووانە، پارەدانی ئۆنلاین و تایبەتمەندیی جزدان لەناو بەرنامەکەدا دەست پێ دەکەین." },
      { q: "کەی داواکارییەکەم دەگات؟", a: "کاتی گەیاندن جیاوازە بەپێی شارەکەت. کاتی خەمڵێنراو هەمیشە بە ڕوونی لە کاتی تەواوکردنی داواکاری دەردەکەوێت." },
      { q: "چ جۆرە بەرهەمێک بەردەستە لەسەر ئێلارا؟", a: "ئێلارا چاودێری پێست، جوانکاری، چاودێری جەستە، چاودێری کەسی، چاودێری منداڵ، ئامێری تەندروستی زیرەک، تەواوکەرەکان، و زیاتر لە باشترین براندەکان پێشکەش دەکات — دەرمان نافرۆشین." },
      { q: "نرخی گەیاندن چەندە؟", a: "نرخی گەیاندن بەپێی شوێنەکەت دیاری دەکرێت. داواکارییەکان بەسەر 50,000 دیناری عێراقی زۆرجار بۆ بەلاش گەیاندن دەکرێن — سەیری ئۆفەرە تایبەتەکان بکە!" },
      { q: "ئایا بەرهەمەکان ئەسڵین؟", a: "بەڵێ. 100% ی بەرهەمەکانی ئێلارا ئەسڵین. ڕاستەوخۆ لە دابەشکەرە مۆڵەتدارەکان دەیانهێنین، و دەتوانیت بە ئارامی تەواو بکڕیت." },
      { q: "دەتوانم بەرهەم بگەڕێنمەوە یان بیگۆڕم؟", a: "بەڵێ، تەنها لەم حاڵەتانەدا:\n\n• ئەگەر بەرهەمی هەڵە وەربگریت، و لەماوەی 48 کاتژمێردا ئاگادارمان بکەیتەوە (نەکراوە).\n• ئەگەر بەرهەمەکە لەکاتی گەیاندن زیانی پێگەیشتبێت و بە بەڵگە لەماوەی 48 کاتژمێردا ڕاپۆرتی بکەیت.\n\nهەر حاڵەتێکی تر لەلایەن تیمی پشتگیریمانەوە پێداچوونەوەی دەکرێت و مەرجەکان جێبەجێ دەکرێن." },
      { q: "بۆ کوێ گەیاندن دەکەن؟", a: "بۆ هەموو شارە سەرەکییەکانی عێراق گەیاندن دەکەین — بەغدا، نەجەف، بەسرە، کەربەلا، مووسڵ، کەرکووک، هەولێر، سلێمانی، دهۆک، و زیاتر. ناوچەی نوێ بەردەوام زیاد دەکرێت." },
    ],
    stillTitle: "هێشتا پرسیارت هەیە؟",
    stillDesc: "ئەگەر وەڵامی پرسیارەکەت لە پرسیارە باوەکاندا نەدۆزیتەوە، هەمیشە دەتوانیت لە ڕێگای واتساپەوە پەیوەندیمان پێوە بکەیت. بە زوویی وەڵامت دەدەینەوە!",
    chatBtn: "لە واتساپ بنووسە",
  },
};

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="rounded-2xl border border-border bg-card shadow-premium overflow-hidden"
    >
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-5 py-4 text-left group">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <HelpCircle className="w-4 h-4 text-primary" />
        </div>
        <span className="flex-1 text-sm font-semibold text-foreground leading-snug">{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0">
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 ps-16">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQPage() {
  const { language } = useLanguage();
  const c = content[language];

  return (
    <PageShell title={c.pageTitle} backTo="/profile">
      <div className="max-w-2xl mx-auto px-4 md:px-6 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold">{c.badge}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">{c.heroTitle}</h1>
          <p className="text-sm text-muted-foreground mt-2">{c.heroSub}</p>
        </motion.div>

        <div className="mt-8 space-y-3">
          {c.faqs.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} index={i} />
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }} className="mt-10 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20 p-6 md:p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-lg font-display font-bold text-foreground">{c.stillTitle}</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{c.stillDesc}</p>
          <a href="https://wa.me/9647703836836" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-5 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-2xl text-sm hover:opacity-90 transition-opacity">
            <MessageCircle className="w-4 h-4" />
            {c.chatBtn}
          </a>
          <p className="text-xs text-muted-foreground mt-3">+964 770 3 836 836</p>
        </motion.div>
      </div>
    </PageShell>
  );
}
