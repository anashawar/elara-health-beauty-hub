import { motion } from "framer-motion";
import { Lock, Mail, Phone, Eye, ShieldCheck, Cookie, Users, Link2, FileText, Database, Share2, UserCheck } from "lucide-react";
import PageShell from "@/components/layout/PageShell";

const sections = [
  {
    icon: Users,
    title: "1. Who We Are",
    items: [
      "ELARA is a digital marketplace that connects users to a curated selection of health, skincare, and beauty products.",
      "Our website is https://elarastore.co, and our mobile apps are available on iOS and Android platforms.",
    ],
  },
  {
    icon: Database,
    title: "2. What Personal Data We Collect",
    intro: "We may collect and store the following types of data:",
    items: [
      "Personal Identifiers: Full name, phone number, email, delivery address",
      "Account Credentials: Username, password (encrypted)",
      "Order Data: Products viewed, added to cart, and purchased",
      "Device & Location Data: IP address, browser type, device type, approximate location",
      "App Usage Data: App version, crash logs, performance metrics",
      "Payment Data: Last 4 digits of card (processed via third-party gateway; we don't store full payment info)",
    ],
  },
  {
    icon: Eye,
    title: "3. How We Use Your Data",
    intro: "We use your data to:",
    items: [
      "Process orders and deliver your products",
      "Improve your shopping experience (personalized offers, smart recommendations)",
      "Manage your account and preferences",
      "Communicate with you (order updates, offers, feedback requests)",
      "Prevent fraud and maintain security",
      "Comply with legal and regulatory requirements",
    ],
  },
  {
    icon: Share2,
    title: "4. Data Sharing",
    intro: "We do not sell your data to third parties. We may share necessary data only with:",
    items: [
      "Delivery partners — for shipping and logistics",
      "Payment processors — to handle secure transactions",
      "IT services & analytics tools — to operate our platform and improve performance",
      "Legal authorities — if required by law",
    ],
  },
  {
    icon: UserCheck,
    title: "5. Your Rights",
    intro: "You have full control over your data. At any time, you may:",
    items: [
      "View and edit your personal information via your account",
      "Request a copy of your data",
      "Ask us to delete your account and personal data (unless legally required to retain it)",
    ],
    footer: "For requests, email: support@elarastore.co",
  },
  {
    icon: Cookie,
    title: "6. Cookies & Tracking Technologies",
    intro: "We use cookies and similar tools to:",
    items: [
      "Keep you logged in",
      "Remember your preferences",
      "Show personalized offers",
      "Monitor app and site performance",
    ],
    footer: "You can manage cookie settings in your browser or device settings.",
  },
  {
    icon: ShieldCheck,
    title: "7. Data Security",
    items: [
      "We use advanced encryption, secure servers, and strong access controls to keep your data safe.",
    ],
  },
  {
    icon: Users,
    title: "8. Children's Privacy",
    items: [
      "ELARA is intended for users aged 18+. We do not knowingly collect data from minors.",
    ],
  },
  {
    icon: Link2,
    title: "9. Third-Party Links",
    items: [
      "Our app and website may include links to external services (like Instagram, YouTube). These platforms have their own privacy policies — we encourage you to review them separately.",
    ],
  },
  {
    icon: FileText,
    title: "10. Changes to This Policy",
    items: [
      "We may update this Privacy Policy from time to time. You will be notified in-app or via email when major changes are made.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy" backTo="/profile">
      <div className="max-w-2xl mx-auto px-4 md:px-6 pb-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-6 rounded-3xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border/50 p-6 md:p-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">Privacy Policy</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Last Updated: 1 March 2026</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Welcome to ELARA — Iraq's first health and beauty e-commerce platform. Your privacy and trust are very important to us. This Privacy Policy explains how we collect, use, store, and protect your data when you visit our website or use our mobile application.
          </p>
        </motion.div>

        {/* Sections */}
        <div className="mt-8 space-y-4">
          {sections.map((section, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
              className="rounded-2xl border border-border bg-card shadow-premium p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <section.icon className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-sm font-display font-bold text-foreground">{section.title}</h2>
              </div>

              {section.intro && (
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{section.intro}</p>
              )}

              <ul className="space-y-2">
                {section.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>

              {section.footer && (
                <p className="text-xs text-primary font-medium mt-3 pt-3 border-t border-border/50">{section.footer}</p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-10 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20 p-6 text-center"
        >
          <h2 className="text-lg font-display font-bold text-foreground mb-2">Contact Us</h2>
          <p className="text-sm text-muted-foreground mb-4">If you have questions or concerns, feel free to contact:</p>
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
