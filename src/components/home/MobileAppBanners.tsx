import { useState } from "react";
import { X, Download, Sparkles, Gift, Smartphone } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import elaraLogo from "@/assets/elara-logo.png";

const isNative = Capacitor.isNativePlatform();

/** Sticky top strip — dismissible "Get the app" bar */
export const MobileAppTopStrip = () => {
  const [dismissed, setDismissed] = useState(false);
  if (isNative || dismissed) return null;

  return (
    <div className="md:hidden relative bg-gradient-to-r from-foreground via-foreground/95 to-foreground/90 text-white px-4 py-2.5 flex items-center gap-3">
      <button onClick={() => setDismissed(true)} className="absolute top-1.5 right-2 p-1 rounded-full hover:bg-white/10 transition-colors">
        <X className="w-3.5 h-3.5 text-white/50" />
      </button>
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-white/10 flex items-center justify-center flex-shrink-0">
        <img src={elaraLogo} alt="ELARA" className="h-5 brightness-0 invert" width={64} height={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold leading-tight">ELARA App</p>
        <p className="text-[10px] text-white/50 leading-tight">Get 15% OFF your first order</p>
      </div>
      <a
        href="#"
        className="flex-shrink-0 px-3.5 py-1.5 bg-primary rounded-full text-[11px] font-bold text-primary-foreground hover:opacity-90 transition-opacity"
      >
        GET
      </a>
    </div>
  );
};

/** Hero-level banner — main push to download */
export const MobileAppHeroBanner = () => {
  if (isNative) return null;

  return (
    <div className="md:hidden px-4 mt-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-foreground via-foreground/95 to-foreground/85 p-5">
        {/* Static glow */}
        <div className="absolute inset-0 opacity-15" style={{
          background: 'radial-gradient(circle at 80% 20%, hsl(var(--primary) / 0.6) 0%, transparent 50%), radial-gradient(circle at 20% 80%, hsl(38 70% 55% / 0.4) 0%, transparent 50%)'
        }} />
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/15 blur-2xl" />

        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-white/10 flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-bold mb-2">
                <Gift className="w-3 h-3" />
                15% OFF FIRST ORDER
              </div>
              <h3 className="text-lg font-display font-bold text-white leading-tight">
                Shop better with<br />the ELARA App
              </h3>
              <p className="text-xs text-white/40 mt-1.5 leading-relaxed">
                Exclusive deals, AI recommendations & faster checkout
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 mt-4">
            <a href="#" className="flex-1 flex items-center justify-center gap-2 py-3 bg-white rounded-xl hover:bg-white/90 transition-colors">
              <svg className="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              <div className="text-left">
                <p className="text-[8px] text-muted-foreground leading-none">Get it on</p>
                <p className="text-xs font-bold text-foreground leading-tight">App Store</p>
              </div>
            </a>
            <a href="#" className="flex-1 flex items-center justify-center gap-2 py-3 bg-white rounded-xl hover:bg-white/90 transition-colors">
              <svg className="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.807 1.626a1 1 0 010 1.732l-2.807 1.626L15.206 12l2.492-2.492zM5.864 2.658L16.8 9.084l-2.302 2.302L5.864 2.658z"/></svg>
              <div className="text-left">
                <p className="text-[8px] text-muted-foreground leading-none">Download on</p>
                <p className="text-xs font-bold text-foreground leading-tight">Google Play</p>
              </div>
            </a>
          </div>

          <p className="text-center text-[10px] text-white/25 mt-3">
            Use code <span className="font-mono font-bold text-primary">ELARA15</span> at checkout
          </p>
        </div>
      </div>
    </div>
  );
};

/** Compact mid-page inline banner */
export const MobileAppInlineBanner = () => {
  if (isNative) return null;

  return (
    <div className="md:hidden px-4 mt-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-4 flex items-center gap-3.5">
        <div className="absolute inset-0 opacity-20" style={{
          background: 'radial-gradient(circle at 90% 50%, white 0%, transparent 60%)'
        }} />
        <div className="relative flex-shrink-0 w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="relative flex-1 min-w-0">
          <p className="text-[11px] font-bold text-white leading-tight">Get the ELARA App</p>
          <p className="text-[10px] text-white/60 leading-tight mt-0.5">15% OFF + exclusive app-only deals</p>
        </div>
        <a
          href="#"
          className="relative flex-shrink-0 px-4 py-2 bg-white rounded-xl text-xs font-bold text-primary hover:bg-white/90 transition-colors"
        >
          Install
        </a>
      </div>
    </div>
  );
};

/** Product page floating banner — slim and sticky */
export const ProductPageAppBanner = () => {
  const [dismissed, setDismissed] = useState(false);
  if (isNative || dismissed) return null;

  return (
    <div className="md:hidden px-4 my-4 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-foreground/95 to-foreground/85 px-4 py-3 flex items-center gap-3">
        <button onClick={() => setDismissed(true)} className="absolute top-1.5 right-2 p-0.5 rounded-full hover:bg-white/10 transition-colors">
          <X className="w-3 h-3 text-white/40" />
        </button>
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/20 border border-white/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-white leading-tight">Better on the app!</p>
          <p className="text-[9px] text-white/40 leading-tight mt-0.5">15% OFF first order • Faster checkout</p>
        </div>
        <a
          href="#"
          className="flex-shrink-0 px-3 py-1.5 bg-primary rounded-full text-[10px] font-bold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Open App
        </a>
      </div>
    </div>
  );
};
