import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, MessageCircle, Sparkles, HelpCircle } from "lucide-react";
import PageShell from "@/components/layout/PageShell";

const faqs = [
  {
    q: "What is ELARA?",
    a: "ELARA is Iraq's first digital platform for health & beauty shopping. From skincare to personal care and wellness products, everything is 100% original, delivered to your door.",
  },
  {
    q: "How can I contact a pharmacist?",
    a: "You can chat with ELARA's licensed pharmacists for free via WhatsApp! Get expert advice before buying any product — safe, quick, and easy.",
  },
  {
    q: "How can I pay for my order?",
    a: "We offer Cash on Delivery (COD) for all cities in Iraq. Soon, we'll launch online payment and wallet features inside the app.",
  },
  {
    q: "When will I receive my order?",
    a: "Delivery time varies based on your city. Your estimated delivery will always appear clearly at checkout.",
  },
  {
    q: "What kind of products are available on ELARA?",
    a: "ELARA offers skincare, cosmetics, body care, personal care, baby care, smart health devices, supplements, and more from top brands — no medicines are sold.",
  },
  {
    q: "How much is the delivery fee?",
    a: "Delivery fees depend on your location. Orders above 50,000 IQD often qualify for free delivery — watch out for special promos!",
  },
  {
    q: "Are the products original?",
    a: "Yes. 100% of ELARA's products are authentic. We source directly from authorized distributors, and you can shop with total peace of mind.",
  },
  {
    q: "Can I return or exchange a product?",
    a: "Yes, only in these cases:\n\n• If you receive the wrong product, and notify us within 48 hours (unopened).\n• If the item is damaged during delivery and reported with proof within 48 hours.\n\nAny other case will be reviewed by our support team and terms may apply.",
  },
  {
    q: "Where do you deliver?",
    a: "We deliver across all major cities in Iraq — Baghdad, Najaf, Basra, Karbala, Mosul, Kirkuk, Erbil, Sulaymaniyah, Duhok, and more. More zones are being added regularly.",
  },
];

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="rounded-2xl border border-border bg-card shadow-premium overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left group"
      >
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <HelpCircle className="w-4 h-4 text-primary" />
        </div>
        <span className="flex-1 text-sm font-semibold text-foreground leading-snug">{q}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
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
  return (
    <PageShell title="FAQ" backTo="/profile">
      <div className="max-w-2xl mx-auto px-4 md:px-6 pb-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-6 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold">FAQ's</span>
          </div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">
            Let's answer your questions
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Everything you need to know about ELARA
          </p>
        </motion.div>

        {/* Questions */}
        <div className="mt-8 space-y-3">
          {faqs.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} index={i} />
          ))}
        </div>

        {/* Still have a question */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-10 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20 p-6 md:p-8 text-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-lg font-display font-bold text-foreground">Still Have a Question?</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            If you cannot find an answer to your question in our FAQ, you can always contact us via WhatsApp. We will answer you shortly!
          </p>
          <a
            href="https://wa.me/9647507229002"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-5 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-2xl text-sm hover:opacity-90 transition-opacity"
          >
            <MessageCircle className="w-4 h-4" />
            Chat on WhatsApp
          </a>
          <p className="text-xs text-muted-foreground mt-3">+964 750 722 9002</p>
        </motion.div>
      </div>
    </PageShell>
  );
}
