import { motion } from "framer-motion";
import { Shield, Mail } from "lucide-react";
import PageShell from "@/components/layout/PageShell";

const sections = [
  {
    title: "1. Ordering Process",
    items: [
      "Once you place an order on ELARA, you will receive a confirmation email and notification with your order details.",
      "Please double-check your delivery address, phone number, and selected items before confirming.",
      "Orders cannot be changed after confirmation unless you contact our support team within 30 minutes.",
    ],
  },
  {
    title: "2. Product Availability",
    items: [
      "All products listed on ELARA are subject to availability.",
      "If an item becomes unavailable after you've placed an order, we will inform you immediately and either suggest a replacement or issue a full refund.",
    ],
  },
  {
    title: "3. Estimated Delivery Time",
    items: [
      "The expected delivery time will be clearly displayed during checkout based on your city/location.",
    ],
  },
  {
    title: "4. Shipping & Delivery",
    items: [
      "Orders above 50,000 IQD qualify for free delivery.",
      "For orders below this threshold, a delivery fee will be calculated at checkout.",
      "Delivery is only available within the cities and regions specified in our app/website. Areas outside the coverage will be notified during order confirmation.",
    ],
  },
  {
    title: "5. Returns, Exchanges & Refunds",
    intro: "We take customer satisfaction seriously. You can request a return or exchange only under the following conditions:",
    subsections: [
      {
        subtitle: "Eligible Return Cases",
        items: [
          "Wrong Product Received — If you receive a product that is not what you ordered, you must notify our support team within 48 hours. Product must remain unopened and in its original packaging.",
          "Damaged or Broken Product — If your item arrives damaged, you must provide proof (photo or video) to our support team within 48 hours. We will verify the damage and may request that you return the item.",
          "Other Return Reasons — Contact our team within 48 hours to request a return. If approved, return shipping and a handling fee may apply depending on your case.",
        ],
      },
      {
        subtitle: "Not Eligible",
        items: [
          "Opened or used cosmetics and skincare products are non-returnable unless proven defective.",
          "Returns requested after 48 hours of delivery will not be accepted under any condition.",
        ],
      },
    ],
  },
  {
    title: "6. Refund Process",
    items: [
      "Approved refunds will be processed within 2–10 business days to your original payment method or via bank transfer.",
      "Delivery fees are non-refundable unless the return is due to an error on our part.",
    ],
  },
  {
    title: "7. Product Information & Accuracy",
    items: [
      "We do our best to display accurate product descriptions, images, and usage instructions.",
      "However, product packaging, ingredients, or instructions may change from the manufacturer. Please refer to the actual product for final details.",
    ],
  },
  {
    title: "8. Account Responsibilities",
    items: [
      "You are responsible for maintaining the confidentiality of your ELARA account.",
      "Any activity under your account is your responsibility.",
      "We reserve the right to suspend or terminate your account if misuse or fraud is detected.",
    ],
  },
  {
    title: "9. Privacy & Data",
    items: [
      "We are committed to protecting your privacy and personal data. Please review our Privacy Policy for more details.",
    ],
  },
  {
    title: "10. Limitation of Liability",
    items: [
      "ELARA is not liable for any damages resulting from the misuse of products sold on our platform.",
      "Always read and follow the product usage instructions. For any medical concerns, consult a healthcare professional before using.",
    ],
  },
  {
    title: "11. Changes to Terms",
    items: [
      "We may update these Terms & Conditions at any time. Any changes will be posted here with an updated revision date.",
      "Your continued use of ELARA means you accept the latest version of our terms.",
    ],
  },
];

export default function TermsPage() {
  return (
    <PageShell title="Terms & Conditions" backTo="/profile">
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
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">Terms & Conditions</h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Welcome to ELARA! These Terms & Conditions govern your access and use of our website, app, products, and services. By using ELARA, you agree to abide by the following terms.
          </p>
        </motion.div>

        {/* Sections */}
        <div className="mt-8 space-y-5">
          {sections.map((section, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
              className="rounded-2xl border border-border bg-card shadow-premium p-5"
            >
              <h2 className="text-sm font-display font-bold text-foreground mb-3">{section.title}</h2>

              {section.intro && (
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{section.intro}</p>
              )}

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

        {/* Contact footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-10 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20 p-6 text-center"
        >
          <Mail className="w-6 h-6 text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you have any questions, please contact us via in-app support or at
          </p>
          <a href="mailto:support@elarastore.co" className="text-sm text-primary font-semibold mt-1 inline-block">
            support@elarastore.co
          </a>
          <p className="text-xs text-muted-foreground mt-4">
            Thank you for shopping with ELARA — where your health & beauty come first! 💜
          </p>
        </motion.div>
      </div>
    </PageShell>
  );
}
