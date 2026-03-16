import { motion } from "framer-motion";
import { Shield, Mail } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import { useLanguage } from "@/i18n/LanguageContext";

interface Section {
  title: string;
  intro?: string;
  items?: string[];
  subsections?: { subtitle: string; items: string[] }[];
}

const content = {
  en: {
    pageTitle: "Terms & Conditions",
    heroTitle: "Terms & Conditions",
    heroDesc: "Welcome to ELARA! These Terms & Conditions govern your access and use of our website, app, products, and services. By using ELARA, you agree to abide by the following terms.",
    sections: [
      { title: "1. Ordering Process", items: ["Once you place an order on ELARA, you will receive a confirmation email and notification with your order details.", "Please double-check your delivery address, phone number, and selected items before confirming.", "Orders cannot be changed after confirmation unless you contact our support team within 30 minutes."] },
      { title: "2. Product Availability", items: ["All products listed on ELARA are subject to availability.", "If an item becomes unavailable after you've placed an order, we will inform you immediately and either suggest a replacement or issue a full refund."] },
      { title: "3. Estimated Delivery Time", items: ["The expected delivery time will be clearly displayed during checkout based on your city/location."] },
      { title: "4. Shipping & Delivery", items: ["Orders above 50,000 IQD qualify for free delivery.", "For orders below this threshold, a delivery fee will be calculated at checkout.", "Delivery is only available within the cities and regions specified in our app/website. Areas outside the coverage will be notified during order confirmation."] },
      { title: "5. Returns, Exchanges & Refunds", intro: "We take customer satisfaction seriously. You can request a return or exchange only under the following conditions:", subsections: [{ subtitle: "Eligible Return Cases", items: ["Wrong Product Received — If you receive a product that is not what you ordered, you must notify our support team within 48 hours. Product must remain unopened and in its original packaging.", "Damaged or Broken Product — If your item arrives damaged, you must provide proof (photo or video) to our support team within 48 hours. We will verify the damage and may request that you return the item.", "Other Return Reasons — Contact our team within 48 hours to request a return. If approved, return shipping and a handling fee may apply depending on your case."] }, { subtitle: "Not Eligible", items: ["Opened or used cosmetics and skincare products are non-returnable unless proven defective.", "Returns requested after 48 hours of delivery will not be accepted under any condition."] }] },
      { title: "6. Refund Process", items: ["Approved refunds will be processed within 2–10 business days to your original payment method or via bank transfer.", "Delivery fees are non-refundable unless the return is due to an error on our part."] },
      { title: "7. Product Information & Accuracy", items: ["We do our best to display accurate product descriptions, images, and usage instructions.", "However, product packaging, ingredients, or instructions may change from the manufacturer. Please refer to the actual product for final details."] },
      { title: "8. Account Responsibilities", items: ["You are responsible for maintaining the confidentiality of your ELARA account.", "Any activity under your account is your responsibility.", "We reserve the right to suspend or terminate your account if misuse or fraud is detected."] },
      { title: "9. Privacy & Data", items: ["We are committed to protecting your privacy and personal data. Please review our Privacy Policy for more details."] },
      { title: "10. Limitation of Liability", items: ["ELARA is not liable for any damages resulting from the misuse of products sold on our platform.", "Always read and follow the product usage instructions. For any medical concerns, consult a healthcare professional before using."] },
      { title: "11. Changes to Terms", items: ["We may update these Terms & Conditions at any time. Any changes will be posted here with an updated revision date.", "Your continued use of ELARA means you accept the latest version of our terms."] },
    ] as Section[],
    contactText: "If you have any questions, please contact us via in-app support or at",
    contactEmail: "info@elarastore.co",
    thanks: "Thank you for shopping with ELARA — where your health & beauty come first! 💜",
  },
  ar: {
    pageTitle: "الشروط والأحكام",
    heroTitle: "الشروط والأحكام",
    heroDesc: "مرحباً بك في إيلارا! هذي الشروط والأحكام تحكم استخدامك لموقعنا، تطبيقنا، منتجاتنا، وخدماتنا. باستخدامك لإيلارا، أنت توافق على الالتزام بالشروط التالية.",
    sections: [
      { title: "1. عملية الطلب", items: ["بمجرد ما تسوي طلب على إيلارا، راح تستلم إيميل تأكيد وإشعار بتفاصيل طلبك.", "رجاءً تأكد من عنوان التوصيل، رقم الهاتف، والمنتجات المختارة قبل التأكيد.", "ما يمكن تغيير الطلب بعد التأكيد إلا إذا تواصلت ويه فريق الدعم خلال 30 دقيقة."] },
      { title: "2. توفر المنتجات", items: ["كل المنتجات المعروضة على إيلارا خاضعة للتوفر.", "إذا صار المنتج غير متوفر بعد ما سويت طلب، راح نبلغك فوراً ونقترح بديل أو نرجعلك المبلغ كامل."] },
      { title: "3. وقت التوصيل المتوقع", items: ["وقت التوصيل المتوقع راح يظهر بوضوح عند إتمام الطلب حسب مدينتك/موقعك."] },
      { title: "4. الشحن والتوصيل", items: ["الطلبات فوق 50,000 دينار عراقي مؤهلة للتوصيل المجاني.", "للطلبات أقل من هالمبلغ، رسوم التوصيل تنحسب عند إتمام الطلب.", "التوصيل متوفر فقط داخل المدن والمناطق المحددة بتطبيقنا/موقعنا. المناطق خارج التغطية راح يتم إبلاغها عند تأكيد الطلب."] },
      { title: "5. الإرجاع والاستبدال والاسترداد", intro: "نأخذ رضا العميل بجدية. تگدر تطلب إرجاع أو استبدال فقط بالحالات التالية:", subsections: [{ subtitle: "حالات الإرجاع المؤهلة", items: ["استلام منتج خطأ — إذا استلمت منتج غير اللي طلبته، لازم تبلغ فريق الدعم خلال 48 ساعة. المنتج لازم يكون مغلق وبتغليفه الأصلي.", "منتج تالف أو مكسور — إذا وصلك المنتج تالف، لازم تقدم دليل (صورة أو فيديو) لفريق الدعم خلال 48 ساعة. راح نتحقق من الضرر وممكن نطلب ترجع المنتج.", "أسباب إرجاع أخرى — تواصل ويه فريقنا خلال 48 ساعة لطلب إرجاع. إذا انوافق، ممكن تنطبق رسوم الشحن والمناولة حسب حالتك."] }, { subtitle: "غير مؤهلة", items: ["مستحضرات التجميل والعناية بالبشرة المفتوحة أو المستخدمة ما ترجع إلا إذا ثبت أنها معيبة.", "طلبات الإرجاع بعد 48 ساعة من التوصيل ما تنقبل بأي حال."] }] },
      { title: "6. عملية الاسترداد", items: ["المبالغ المسترجعة المعتمدة تنعالج خلال 2-10 أيام عمل لطريقة الدفع الأصلية أو عبر تحويل بنكي.", "رسوم التوصيل ما ترجع إلا إذا الإرجاع بسبب خطأ من طرفنا."] },
      { title: "7. معلومات المنتج ودقتها", items: ["نسوي أقصى جهدنا لعرض أوصاف ومنتجات وصور وتعليمات استخدام دقيقة.", "لكن تغليف المنتج، المكونات، أو التعليمات ممكن تتغير من المصنّع. رجاءً ارجع للمنتج الفعلي للتفاصيل النهائية."] },
      { title: "8. مسؤوليات الحساب", items: ["أنت مسؤول عن الحفاظ على سرية حسابك بإيلارا.", "أي نشاط تحت حسابك مسؤوليتك.", "نحتفظ بالحق بتعليق أو إنهاء حسابك إذا تم اكتشاف إساءة استخدام أو احتيال."] },
      { title: "9. الخصوصية والبيانات", items: ["نلتزم بحماية خصوصيتك وبياناتك الشخصية. رجاءً راجع سياسة الخصوصية لمزيد من التفاصيل."] },
      { title: "10. حدود المسؤولية", items: ["إيلارا ما تتحمل مسؤولية أي أضرار ناتجة عن سوء استخدام المنتجات المباعة على منصتنا.", "دائماً اقرأ واتبع تعليمات استخدام المنتج. لأي مخاوف طبية، استشر متخصص صحي قبل الاستخدام."] },
      { title: "11. تغييرات على الشروط", items: ["ممكن نحدّث هذي الشروط والأحكام بأي وقت. أي تغييرات راح تنشر هنا بتاريخ مراجعة محدث.", "استمرارك باستخدام إيلارا يعني قبولك لآخر نسخة من شروطنا."] },
    ] as Section[],
    contactText: "إذا عندك أي أسئلة، تواصل وياانا عبر الدعم داخل التطبيق أو على",
    contactEmail: "info@elarastore.co",
    thanks: "شكراً لتسوقك مع إيلارا — حيث صحتك وجمالك بالمقام الأول! 💜",
  },
  ku: {
    pageTitle: "مەرج و ڕێساکان",
    heroTitle: "مەرج و ڕێساکان",
    heroDesc: "بەخێربێیت بۆ ئێلارا! ئەم مەرج و ڕێسایانە دەستگەیشتن و بەکارهێنانی ماڵپەڕ، بەرنامە، بەرهەم، و خزمەتگوزارییەکانمان ڕێکدەخەن. بە بەکارهێنانی ئێلارا، ڕازی دەبیت بەم مەرجانە.",
    sections: [
      { title: "1. ڕێکاری داواکاری", items: ["کاتێک داواکارییەکت دەکەیت لەسەر ئێلارا، ئیمەیڵی پشتڕاستکردنەوە و ئاگادارکردنەوە بە وردەکارییەکانی داواکارییەکەت وەردەگریت.", "تکایە پێش پشتڕاستکردنەوە ناونیشانی گەیاندن، ژمارەی مۆبایل، و بەرهەمە هەڵبژێردراوەکان دووبارە بپشکنە.", "داواکارییەکان ناگۆڕدرێن لەدوای پشتڕاستکردنەوە تەنها ئەگەر لەماوەی 30 خولەکدا پەیوەندی بە تیمی پشتگیریمانەوە بکەیت."] },
      { title: "2. بەردەستبوونی بەرهەم", items: ["هەموو بەرهەمەکانی لیستکراو لەسەر ئێلارا بەپێی بەردەستبوون.", "ئەگەر بەرهەمێک نەمایە لەدوای داواکارییەکەت، دەستبەجێ ئاگادارت دەکەینەوە و یان بەرهەمێکی جێگرەوە پێشنیار دەکەین یان پارەکەت تەواو دەگەڕێنینەوە."] },
      { title: "3. کاتی گەیاندنی خەمڵێنراو", items: ["کاتی گەیاندنی چاوەڕوانکراو بە ڕوونی لەکاتی تەواوکردنی داواکاری دەردەکەوێت بەپێی شار/شوێنەکەت."] },
      { title: "4. ناردن و گەیاندن", items: ["داواکارییەکان بەسەر 50,000 دیناری عێراقی بۆ گەیاندنی بەلاش.", "بۆ داواکارییەکانی کەمتر لەم بڕە، نرخی گەیاندن لەکاتی تەواوکردنی داواکاری دەژمێردرێت.", "گەیاندن تەنها لەو شار و ناوچانەی کە لە بەرنامە/ماڵپەڕەکەماندا دیاریکراون بەردەستە. ناوچەکانی دەرەوەی دەستگەیشتن لەکاتی پشتڕاستکردنەوەی داواکاری ئاگاداردەکرێنەوە."] },
      { title: "5. گەڕاندنەوە، ئاڵوگۆڕ و گەڕاندنەوەی پارە", intro: "ڕەزامەندیی کڕیار بە جددی وەردەگرین. تەنها لەم حاڵەتانەدا داوای گەڕاندنەوە یان ئاڵوگۆڕ دەکرێت:", subsections: [{ subtitle: "حاڵەتە شایستەکان", items: ["بەرهەمی هەڵە وەرگیراوە — ئەگەر بەرهەمێکت وەرگرت کە ئەوە نییە داوات کردووە، دەبێت لەماوەی 48 کاتژمێردا ئاگاداری تیمی پشتگیری بکەیتەوە. بەرهەمەکە دەبێت نەکراوە بێت و لە پاکەتی ئەسڵیدا بێت.", "بەرهەمی زیاندیتوو — ئەگەر بەرهەمەکەت زیاندیتوو گەیشت، دەبێت بەڵگە (وێنە یان ڤیدیۆ) پێشکەشی تیمی پشتگیری بکەیت لەماوەی 48 کاتژمێردا.", "هۆکارەکانی تری گەڕاندنەوە — لەماوەی 48 کاتژمێردا پەیوەندی بە تیمەکەمانەوە بکە بۆ داواکردنی گەڕاندنەوە. ئەگەر ڕازی بکرێتەوە، نرخی ناردنەوە و کرێی مامەڵە لەوانەیە جێبەجێ بکرێت."] }, { subtitle: "شایستە نییە", items: ["بەرهەمەکانی جوانکاری و چاودێری پێستی کراوە یان بەکارهاتوو ناگەڕێنرێنەوە تەنها ئەگەر کەموکوڕی ثابتکرابێت.", "داوای گەڕاندنەوە لەدوای 48 کاتژمێر لە گەیاندن بە هیچ شێوەیەک قبوڵ ناکرێت."] }] },
      { title: "6. ڕێکاری گەڕاندنەوەی پارە", items: ["پارەی پشتڕاستکراو لەماوەی 2-10 ڕۆژی کاریدا بۆ ڕێگەی پارەدانی ئەسڵی یان لە ڕێگای گواستنەوەی بانکییەوە دەگەڕێتەوە.", "نرخی گەیاندن ناگەڕێتەوە تەنها ئەگەر گەڕاندنەوەکە بەهۆی هەڵەی ئێمەوە بێت."] },
      { title: "7. زانیاری بەرهەم و وردبینی", items: ["هەوڵی خۆمان دەدەین وەسفی بەرهەم، وێنە، و ڕێنمایی بەکارهێنانی وورد نیشان بدەین.", "بەڵام پاکەتکردنی بەرهەم، ناوەڕۆکەکان، یان ڕێنماییەکان لەوانەیە لەلایەن بەرهەمهێنەرەوە بگۆڕدرێن. تکایە بۆ وردەکاری کۆتایی سەیری بەرهەمی ڕاستەقینە بکە."] },
      { title: "8. بەرپرسیارێتیی ئەکاونت", items: ["تۆ بەرپرسیاری پاراستنی نهێنیی ئەکاونتەکەتی لە ئێلارا.", "هەر چالاکییەک لەژێر ئەکاونتەکەتدا بەرپرسیارێتیی تۆیە.", "مافمان هەیە ئەکاونتەکەت ڕابگرین یان کۆتایی پێ بهێنین ئەگەر سوءاستفادە یان فێڵ بدۆزرێتەوە."] },
      { title: "9. تایبەتمەندی و داتا", items: ["پابەندین بە پاراستنی تایبەتمەندی و داتای کەسیت. تکایە سیاسەتی تایبەتمەندی بپشکنە بۆ وردەکاری زیاتر."] },
      { title: "10. سنووری بەرپرسیارێتی", items: ["ئێلارا بەرپرسیار نییە بۆ هەر زیانێک کە لە سوءاستفادەی بەرهەمەکانی فرۆشراو لەسەر پلاتفۆرمەکەمان دەرکەوێت.", "هەمیشە ڕێنمایی بەکارهێنانی بەرهەم بخوێنەرەوە و شوێنی بکەوە. بۆ هەر نیگەرانییەکی پزیشکی، پێش بەکارهێنان ڕاوێژ لەگەڵ پسپۆڕی تەندروستی بکە."] },
      { title: "11. گۆڕانکاری لە مەرجەکان", items: ["لەوانەیە ئەم مەرج و ڕێسایانە لە هەر کاتێکدا نوێ بکەینەوە. هەر گۆڕانکارییەک لێرە بڵاو دەکرێتەوە بە بەرواری نوێکردنەوە.", "بەردەوامبوونت لە بەکارهێنانی ئێلارا واتای قبوڵکردنی دوایین وەشانی مەرجەکانمانە."] },
    ] as Section[],
    contactText: "ئەگەر پرسیارت هەیە، تکایە لە ڕێگای پشتگیری ناو بەرنامەکەوە یان لەم ئیمەیڵەوە پەیوەندیمان پێوە بکە",
    contactEmail: "support@elarastore.co",
    thanks: "سوپاس بۆ کڕینت لەگەڵ ئێلارا — کە تەندروستی و جوانیت لە پێشدایە! 💜",
  },
};

export default function TermsPage() {
  const { language } = useLanguage();
  const c = content[language];

  return (
    <PageShell title={c.pageTitle} backTo="/profile">
      <div className="max-w-2xl mx-auto px-4 md:px-6 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mt-6 rounded-3xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border/50 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">{c.heroTitle}</h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{c.heroDesc}</p>
        </motion.div>

        <div className="mt-8 space-y-5">
          {c.sections.map((section, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.4 }} className="rounded-2xl border border-border bg-card shadow-premium p-5">
              <h2 className="text-sm font-display font-bold text-foreground mb-3">{section.title}</h2>
              {section.intro && <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{section.intro}</p>}
              {section.items && (
                <ul className="space-y-2">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              {section.subsections?.map((sub, k) => (
                <div key={k} className={k > 0 ? "mt-4 pt-4 border-t border-border/50" : "mt-1"}>
                  <h3 className="text-xs font-bold text-foreground mb-2 uppercase tracking-wide">{sub.subtitle}</h3>
                  <ul className="space-y-2">
                    {sub.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }} className="mt-10 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20 p-6 text-center">
          <Mail className="w-6 h-6 text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground leading-relaxed">{c.contactText}</p>
          <a href={`mailto:${c.contactEmail}`} className="text-sm text-primary font-semibold mt-1 inline-block">{c.contactEmail}</a>
          <p className="text-xs text-muted-foreground mt-4">{c.thanks}</p>
        </motion.div>
      </div>
    </PageShell>
  );
}
