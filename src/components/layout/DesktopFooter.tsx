import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import elaraLogo from "@/assets/elara-logo.png";
import { Instagram, Facebook, MessageCircle, Mail, MapPin, Phone } from "lucide-react";

const DesktopFooter = () => {
  const { t } = useLanguage();

  return (
    <footer className="hidden md:block bg-card border-t border-border mt-16">
      <div className="max-w-7xl mx-auto px-8 py-14">
        <div className="grid grid-cols-4 gap-12">
          {/* Brand column */}
          <div className="space-y-5">
            <Link to="/home" className="flex items-center gap-2">
              <img src={elaraLogo} alt="ELARA" className="h-9 w-auto" />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Iraq's premier health & beauty destination. Original products, AI-powered skincare, and 24h delivery.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://instagram.com/elara.iq" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-secondary hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-all">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://facebook.com/elara.iq" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-secondary hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-all">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="https://wa.me/9647703836836" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-secondary hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-all">
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-foreground tracking-wide uppercase">Shop</h4>
            <nav className="flex flex-col gap-2.5">
              <Link to="/categories" className="text-sm text-muted-foreground hover:text-primary transition-colors">All Categories</Link>
              <Link to="/collection/trending" className="text-sm text-muted-foreground hover:text-primary transition-colors">Trending</Link>
              <Link to="/collection/new" className="text-sm text-muted-foreground hover:text-primary transition-colors">New Arrivals</Link>
              <Link to="/collection/offers" className="text-sm text-muted-foreground hover:text-primary transition-colors">Special Offers</Link>
              <Link to="/collection/picks" className="text-sm text-muted-foreground hover:text-primary transition-colors">ELARA Picks</Link>
            </nav>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-foreground tracking-wide uppercase">Company</h4>
            <nav className="flex flex-col gap-2.5">
              <Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("profile.aboutElara")}</Link>
              <Link to="/faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("profile.faq")}</Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("profile.termsConditions")}</Link>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("profile.privacyPolicy")}</Link>
              <Link to="/support" className="text-sm text-muted-foreground hover:text-primary transition-colors">Support</Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-foreground tracking-wide uppercase">Contact</h4>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">Erbil, Kurdistan Region, Iraq</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm text-muted-foreground">+964 770 3 836 836</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm text-muted-foreground">info@elarastore.co</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ELARA. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground/60 tracking-wider uppercase">100% Original Products</span>
            <span className="text-muted-foreground/30 mx-2">·</span>
            <span className="text-[10px] text-muted-foreground/60 tracking-wider uppercase">Fast Delivery</span>
            <span className="text-muted-foreground/30 mx-2">·</span>
            <span className="text-[10px] text-muted-foreground/60 tracking-wider uppercase">AI-Powered Skincare</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default DesktopFooter;
