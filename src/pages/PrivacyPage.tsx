import { motion } from "framer-motion";
import { Lock, Mail, Phone, Eye, ShieldCheck, Cookie, Users, Link2, FileText, Database, Share2, UserCheck } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import { useLanguage } from "@/i18n/LanguageContext";
import type { LucideIcon } from "lucide-react";

interface Section {
  icon: LucideIcon;
  title: string;
  intro?: string;
  items: string[];
  footer?: string;
}

const sectionIcons: LucideIcon[] = [Users, Database, Eye, Share2, UserCheck, Cookie, ShieldCheck, Users, Link2, FileText];

const content = {
  en: {
    pageTitle: "Privacy Policy",
    heroTitle: "Privacy Policy",
    lastUpdated: "Last Updated: 1 March 2026",
    heroDesc: "Welcome to ELARA — Iraq's first health and beauty e-commerce platform. Your privacy and trust are very important to us. This Privacy Policy explains how we collect, use, store, and protect your data when you visit our website or use our mobile application.",
    sections: [
      { title: "1. Who We Are", items: ["ELARA is a digital marketplace that connects users to a curated selection of health, skincare, and beauty products.", "Our website is https://elarastore.co, and our mobile apps are available on iOS and Android platforms."] },
      { title: "2. What Personal Data We Collect", intro: "We may collect and store the following types of data:", items: ["Personal Identifiers: Full name, phone number, email, delivery address", "Account Credentials: Username, password (encrypted)", "Order Data: Products viewed, added to cart, and purchased", "Device & Location Data: IP address, browser type, device type, approximate location", "App Usage Data: App version, crash logs, performance metrics", "Payment Data: Last 4 digits of card (processed via third-party gateway; we don't store full payment info)"] },
      { title: "3. How We Use Your Data", intro: "We use your data to:", items: ["Process orders and deliver your products", "Improve your shopping experience (personalized offers, smart recommendations)", "Manage your account and preferences", "Communicate with you (order updates, offers, feedback requests)", "Prevent fraud and maintain security", "Comply with legal and regulatory requirements"] },
      { title: "4. Data Sharing", intro: "We do not sell your data to third parties. We may share necessary data only with:", items: ["Delivery partners — for shipping and logistics", "Payment processors — to handle secure transactions", "IT services & analytics tools — to operate our platform and improve performance", "Legal authorities — if required by law"] },
      { title: "5. Your Rights", intro: "You have full control over your data. At any time, you may:", items: ["View and edit your personal information via your account", "Request a copy of your data", "Ask us to delete your account and personal data (unless legally required to retain it)"], footer: "For requests, email: support@elarastore.co" },
      { title: "6. Cookies & Tracking Technologies", intro: "We use cookies and similar tools to:", items: ["Keep you logged in", "Remember your preferences", "Show personalized offers", "Monitor app and site performance"], footer: "You can manage cookie settings in your browser or device settings." },
      { title: "7. Data Security", items: ["We use advanced encryption, secure servers, and strong access controls to keep your data safe."] },
      { title: "8. Children's Privacy", items: ["ELARA is intended for users aged 18+. We do not knowingly collect data from minors."] },
      { title: "9. Third-Party Links", items: ["Our app and website may include links to external services (like Instagram, YouTube). These platforms have their own privacy policies — we encourage you to review them separately."] },
      { title: "10. Changes to This Policy", items: ["We may update this Privacy Policy from time to time. You will be notified in-app or via email when major changes are made."] },
    ],
    contactTitle: "Contact Us",
    contactDesc: "If you have questions or concerns, feel free to contact:",
  },
  ar: {
    pageTitle: "سياسة الخصوصية",
    heroTitle: "سياسة الخصوصية",
    lastUpdated: "آخر تحديث: 1 مارس 2026",
    heroDesc: "مرحباً بك في إيلارا — أول منصة للتجارة الإلكترونية للصحة والجمال بالعراق. خصوصيتك وثقتك مهمة جداً عدنا. هذي سياسة الخصوصية توضح كيف نجمع، نستخدم، نخزّن، ونحمي بياناتك لما تزور موقعنا أو تستخدم تطبيقنا.",
    sections: [
      { title: "1. من نحن", items: ["إيلارا هي سوق رقمي يربط المستخدمين بمجموعة مختارة من منتجات الصحة والعناية بالبشرة والجمال.", "موقعنا هو https://elarastore.co، وتطبيقاتنا متوفرة على iOS و Android."] },
      { title: "2. شنو البيانات الشخصية اللي نجمعها", intro: "ممكن نجمع ونخزّن الأنواع التالية من البيانات:", items: ["معرّفات شخصية: الاسم الكامل، رقم الهاتف، الإيميل، عنوان التوصيل", "بيانات الحساب: اسم المستخدم، كلمة السر (مشفّرة)", "بيانات الطلب: المنتجات المشاهدة والمضافة للسلة والمشتراة", "بيانات الجهاز والموقع: عنوان IP، نوع المتصفح، نوع الجهاز، الموقع التقريبي", "بيانات استخدام التطبيق: نسخة التطبيق، سجلات الأعطال، مقاييس الأداء", "بيانات الدفع: آخر 4 أرقام من البطاقة (تتم المعالجة عبر بوابة طرف ثالث؛ ما نخزّن معلومات الدفع الكاملة)"] },
      { title: "3. كيف نستخدم بياناتك", intro: "نستخدم بياناتك عشان:", items: ["نعالج الطلبات ونوصل منتجاتك", "نحسّن تجربة التسوق (عروض شخصية، توصيات ذكية)", "ندير حسابك وتفضيلاتك", "نتواصل وياك (تحديثات الطلب، عروض، طلبات ملاحظات)", "نمنع الاحتيال ونحافظ على الأمان", "نلتزم بالمتطلبات القانونية والتنظيمية"] },
      { title: "4. مشاركة البيانات", intro: "ما نبيع بياناتك لأطراف ثالثة. ممكن نشارك البيانات الضرورية فقط مع:", items: ["شركاء التوصيل — للشحن والخدمات اللوجستية", "معالجات الدفع — لمعالجة المعاملات الآمنة", "خدمات تقنية المعلومات وأدوات التحليل — لتشغيل منصتنا وتحسين الأداء", "السلطات القانونية — إذا تطلب القانون"] },
      { title: "5. حقوقك", intro: "عندك سيطرة كاملة على بياناتك. بأي وقت، تگدر:", items: ["تشوف وتعدّل معلوماتك الشخصية من حسابك", "تطلب نسخة من بياناتك", "تطلب حذف حسابك وبياناتك الشخصية (إلا إذا القانون يتطلب الاحتفاظ بيها)"], footer: "للطلبات، راسلنا: support@elarastore.co" },
      { title: "6. ملفات تعريف الارتباط وتقنيات التتبع", intro: "نستخدم ملفات تعريف الارتباط وأدوات مشابهة عشان:", items: ["نخليك مسجل الدخول", "نتذكر تفضيلاتك", "نعرض عروض شخصية", "نراقب أداء التطبيق والموقع"], footer: "تگدر تدير إعدادات ملفات تعريف الارتباط من متصفحك أو إعدادات جهازك." },
      { title: "7. أمن البيانات", items: ["نستخدم تشفير متقدم، خوادم آمنة، وضوابط وصول قوية لحماية بياناتك."] },
      { title: "8. خصوصية الأطفال", items: ["إيلارا مخصصة للمستخدمين بعمر 18+ سنة. ما نجمع بيانات من القاصرين عن عمد."] },
      { title: "9. روابط أطراف ثالثة", items: ["تطبيقنا وموقعنا ممكن يحتوي على روابط لخدمات خارجية (مثل إنستغرام، يوتيوب). هذي المنصات عندها سياسات خصوصية خاصة بيها — ننصحك تراجعها بشكل منفصل."] },
      { title: "10. تغييرات على هذي السياسة", items: ["ممكن نحدّث سياسة الخصوصية هذي من وقت لآخر. راح يتم إبلاغك داخل التطبيق أو عبر الإيميل لما تصير تغييرات كبيرة."] },
    ],
    contactTitle: "تواصل وياانا",
    contactDesc: "إذا عندك أسئلة أو مخاوف، لا تتردد تتواصل:",
  },
  ku: {
    pageTitle: "سیاسەتی تایبەتمەندی",
    heroTitle: "سیاسەتی تایبەتمەندی",
    lastUpdated: "دوایین نوێکردنەوە: 1ی ئازار 2026",
    heroDesc: "بەخێربێیت بۆ ئێلارا — یەکەمین پلاتفۆرمی بازرگانی ئەلیکترۆنی تەندروستی و جوانی لە عێراق. تایبەتمەندی و متمانەت زۆر گرنگە بۆمان. ئەم سیاسەتی تایبەتمەندییە ڕوون دەکاتەوە چۆن داتاکانت کۆ دەکەینەوە، بەکاردەهێنین، ئەخەزنین، و دەیپارێزین کاتێک سەردانی ماڵپەڕەکەمان دەکەیت یان بەرنامەکەمان بەکاردەهێنیت.",
    sections: [
      { title: "1. ئێمە کێین", items: ["ئێلارا بازاڕێکی دیجیتاڵییە کە بەکارهێنەران دەبەستێتەوە بە کۆمەڵەیەکی هەڵبژێردراو لە بەرهەمی تەندروستی، چاودێری پێست، و جوانی.", "ماڵپەڕەکەمان https://elarastore.co یە، و بەرنامەکانمان لەسەر iOS و Android بەردەستن."] },
      { title: "2. چ داتای کەسیانە کۆ دەکەینەوە", intro: "لەوانەیە ئەم جۆرە داتایانە کۆ بکەینەوە و بیخەزنین:", items: ["ناسنامەی کەسی: ناوی تەواو، ژمارەی مۆبایل، ئیمەیڵ، ناونیشانی گەیاندن", "زانیاری ئەکاونت: ناوی بەکارهێنەر، وشەی نهێنی (شیفرەکراو)", "داتای داواکاری: بەرهەمە بینراوەکان، زیادکراوەکان بۆ سەبەتە، و کڕدراوەکان", "داتای ئامێر و شوێن: ناونیشانی IP، جۆری وێبگەڕ، جۆری ئامێر، شوێنی نزیک", "داتای بەکارهێنانی بەرنامە: وەشانی بەرنامە، تۆماری کێشەکان، پێوانەی ئەدا", "داتای پارەدان: دوایین 4 ژمارەی کارت (لە ڕێگای دەروازەی لایەنی سێیەمەوە؛ زانیاری پارەدانی تەواو ناخەزنین)"] },
      { title: "3. چۆن داتاکانت بەکاردەهێنین", intro: "داتاکانت بەکاردەهێنین بۆ:", items: ["مامەڵەکردنی داواکاری و گەیاندنی بەرهەمەکانت", "باشترکردنی ئەزموونی کڕینت (ئۆفەری تایبەت، پێشنیاری زیرەک)", "بەڕێوەبردنی ئەکاونت و ئارەزووەکانت", "پەیوەندیکردن لەگەڵت (نوێکردنەوەی داواکاری، ئۆفەر، داوای فیدباک)", "ڕێگری لە فێڵ و پاراستنی ئەمنیەت", "پابەندبوون بە پێداویستییە یاسایی و ڕێکخستنییەکان"] },
      { title: "4. هاوبەشکردنی داتا", intro: "داتاکانت نافرۆشین بە لایەنی سێیەم. لەوانەیە داتای پێویست تەنها لەگەڵ ئەمانەدا هاوبەش بکەین:", items: ["هاوبەشەکانی گەیاندن — بۆ ناردن و خزمەتگوزاری", "پرۆسێسەری پارەدان — بۆ مامەڵەی سەلامەت", "خزمەتگوزاری IT و ئامرازی شیکاری — بۆ کارکردنی پلاتفۆرمەکەمان و باشترکردنی ئەدا", "دەسەڵاتە یاساییەکان — ئەگەر یاسا داوای بکات"] },
      { title: "5. مافەکانت", intro: "کۆنترۆڵی تەواوت هەیە لەسەر داتاکانت. لە هەر کاتێکدا، دەتوانیت:", items: ["زانیاری کەسیت لە ئەکاونتەکەتەوە ببینیت و بیگۆڕیت", "داوای کۆپییەک لە داتاکانت بکەیت", "داوا بکەیت ئەکاونت و داتای کەسیت بسڕدرێتەوە (تەنها ئەگەر یاسا داوای نەکات)"], footer: "بۆ داواکارییەکان، ئیمەیڵ بکە بۆ: support@elarastore.co" },
      { title: "6. کووکیز و تەکنەلۆژیای شوێنکەوتن", intro: "کووکیز و ئامرازی هاوشێوە بەکاردەهێنین بۆ:", items: ["لۆگینکراو بمێنیتەوە", "ئارەزووەکانت بیربێتەوە", "ئۆفەری تایبەت نیشان بدات", "ئەدای بەرنامە و ماڵپەڕ بچاودێرین"], footer: "دەتوانیت ڕێکخستنەکانی کووکیز لە وێبگەڕ یان ڕێکخستنی ئامێرەکەتەوە بەڕێوەببەیت." },
      { title: "7. ئەمنیەتی داتا", items: ["شیفرەکردنی پێشکەوتوو، سێرڤەری سەلامەت، و کۆنترۆڵی دەستگەیشتنی بەهێز بەکاردەهێنین بۆ پاراستنی داتاکانت."] },
      { title: "8. تایبەتمەندیی منداڵان", items: ["ئێلارا بۆ بەکارهێنەرانی تەمەنی 18+ ساڵ دروستکراوە. بە ئەنقەست داتا لە منداڵان کۆ ناکەینەوە."] },
      { title: "9. بەستەرەکانی لایەنی سێیەم", items: ["بەرنامە و ماڵپەڕەکەمان لەوانەیە بەستەری خزمەتگوزاری دەرەکی لەخۆ بگرێت (وەک ئینستاگرام، یوتیوب). ئەم پلاتفۆرمانە سیاسەتی تایبەتمەندیی تایبەتی خۆیان هەیە — هاندەدەین بە جیا پێیان بچیتەوە."] },
      { title: "10. گۆڕانکاری لەم سیاسەتەدا", items: ["لەوانەیە ئەم سیاسەتی تایبەتمەندییە لە کاتێک بۆ کاتێکی تر نوێ بکەینەوە. لەناو بەرنامەکەدا یان لە ڕێگای ئیمەیڵەوە ئاگادارت دەکەینەوە کاتێک گۆڕانکاریی گەورە ڕوودەدات."] },
    ],
    contactTitle: "پەیوەندیمان پێوە بکە",
    contactDesc: "ئەگەر پرسیار یان نیگەرانیت هەیە، بە ئازادی پەیوەندی بکە:",
  },
};

export default function PrivacyPage() {
  const { language } = useLanguage();
  const c = content[language];

  return (
    <PageShell title={c.pageTitle} backTo="/profile">
      <div className="max-w-2xl mx-auto px-4 md:px-6 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mt-6 rounded-3xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border/50 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">{c.heroTitle}</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">{c.lastUpdated}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{c.heroDesc}</p>
        </motion.div>

        <div className="mt-8 space-y-4">
          {c.sections.map((section, i) => {
            const Icon = sectionIcons[i] || FileText;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.4 }} className="rounded-2xl border border-border bg-card shadow-premium p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="text-sm font-display font-bold text-foreground">{section.title}</h2>
                </div>
                {section.intro && <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{section.intro}</p>}
                <ul className="space-y-2">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
                {section.footer && <p className="text-xs text-primary font-medium mt-3 pt-3 border-t border-border/50">{section.footer}</p>}
              </motion.div>
            );
          })}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }} className="mt-10 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20 p-6 text-center">
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{c.contactTitle}</h2>
          <p className="text-sm text-muted-foreground mb-4">{c.contactDesc}</p>
          <div className="flex flex-col items-center gap-2">
            <a href="mailto:support@elarastore.co" className="inline-flex items-center gap-2 text-sm text-primary font-semibold">
              <Mail className="w-4 h-4" /> support@elarastore.co
            </a>
            <a href="tel:+9647507229002" className="inline-flex items-center gap-2 text-sm text-primary font-semibold">
              <Phone className="w-4 h-4" /> +964 750 722 9002
            </a>
          </div>
        </motion.div>
      </div>
    </PageShell>
  );
}
