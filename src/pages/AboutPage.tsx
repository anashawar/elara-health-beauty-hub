import { motion } from "framer-motion";
import { CheckCircle2, Sparkles, Globe, Users, ShieldCheck, Heart, ArrowRight } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import elaraBanner from "@/assets/elara-banner.webp";

const stats = [
  { value: "100%", label: "Verified Brands" },
  { value: "1500+", label: "Products" },
  { value: "250+", label: "Brands" },
];

const differentiators = [
  {
    icon: Sparkles,
    title: "Smart & Personal",
    desc: "AI consultations, smart search, and tailored routines",
  },
  {
    icon: Globe,
    title: "Multilingual & Local",
    desc: "Arabic, Kurdish, and English — we speak your language",
  },
  {
    icon: Users,
    title: "Community-first",
    desc: "Built to connect, empower, and glow up Iraq's health & beauty culture",
  },
  {
    icon: ShieldCheck,
    title: "Only Original",
    desc: "Everything on ELARA is verified and original",
  },
];

const reasons = [
  "Because your time matters.",
  "Because your skin deserves the real deal.",
  "Because your health starts with what you choose — and we make choosing easier.",
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

export default function AboutPage() {
  return (
    <PageShell title="About ELARA" backTo="/profile">
      <div className="max-w-2xl mx-auto px-4 md:px-6 pb-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mt-6 rounded-3xl overflow-hidden relative bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border/50"
        >
          <img
            src={elaraBanner}
            alt="ELARA delivery"
            className="w-full h-48 md:h-64 object-cover object-center"
          />
          <div className="p-6 md:p-8">
            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground leading-snug">
              Welcome to <span className="text-primary">ELARA</span>, Iraq's first smart health & beauty platform
            </h1>
          </div>
        </motion.div>

        {/* Mission text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mt-8 space-y-4 text-sm md:text-base text-muted-foreground leading-relaxed"
        >
          <p>
            We're not just an online store — we're a <span className="text-foreground font-medium">new way to care for yourself</span>.
          </p>
          <p>
            ELARA is Iraq's first health & beauty platform built to bring you trusted products, powerful tools, and a seamless experience — all in one place.
          </p>
          <p>
            From skincare and cosmetics to wellness devices and supplements, we handpick everything with one promise:{" "}
            <span className="text-primary font-semibold">100% authenticity, zero compromise</span>.
          </p>
          <p>
            We know what it's like to search for original products, fair prices, fast delivery, and good service in healthcare and beauty — so we built ELARA to deliver all that. Every product is verified. Every order is tracked. Every experience is made for you.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="mt-10 grid grid-cols-3 gap-3"
        >
          {stats.map((s) => (
            <div
              key={s.label}
              className="text-center py-5 rounded-2xl bg-card border border-border shadow-premium"
            >
              <p className="text-2xl md:text-3xl font-display font-black text-primary">{s.value}</p>
              <p className="text-[11px] md:text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* What makes ELARA different */}
        <div className="mt-12">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-lg md:text-xl font-display font-bold text-foreground mb-5"
          >
            What makes ELARA different?
          </motion.h2>
          <div className="space-y-3">
            {differentiators.map((d, i) => (
              <motion.div
                key={d.title}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-premium"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <d.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{d.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{d.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Closing statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-muted-foreground leading-relaxed">
            We're here to simplify your beauty journey — and make self-care a daily joy.
          </p>
        </motion.div>

        {/* Choose ELARA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-10 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20 p-6 md:p-8"
        >
          <h2 className="text-lg md:text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            Choose ELARA
          </h2>
          <ul className="space-y-3">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-10 text-center"
        >
          <p className="text-xs text-muted-foreground">Have questions? Reach out anytime.</p>
          <p className="text-xs text-primary font-semibold mt-1">Contact us — info@elara.iq</p>
        </motion.div>
      </div>
    </PageShell>
  );
}
