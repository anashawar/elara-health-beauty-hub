import { Sparkles, Smartphone } from "lucide-react";
import elaraLogo from "@/assets/elara-logo.png";

interface AppDownloadBannerProps {
  compact?: boolean;
}

const AppDownloadBanner = ({ compact = false }: AppDownloadBannerProps) => {

  if (compact) {
    return (
      <div className="hidden md:block">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-violet-600 p-6">
          <div className="absolute inset-0 opacity-20" style={{
            background: 'radial-gradient(circle at 80% 20%, hsl(352 42% 55% / 0.5) 0%, transparent 50%), radial-gradient(circle at 20% 80%, hsl(38 70% 55% / 0.4) 0%, transparent 50%)'
          }} />
          <div className="relative flex items-center gap-5">
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <Smartphone className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Download ELARA App</p>
              <p className="text-xs text-white/60 mt-0.5">Get 15% OFF on your first order!</p>
            </div>
            <div className="flex items-center gap-3">
              <a href="https://apps.apple.com/us/app/elara-beauty-health/id6761014159" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 bg-black rounded-xl hover:bg-black/80 transition-colors">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                <div>
                  <p className="text-[8px] text-white/60 leading-none">Get it on</p>
                  <p className="text-xs font-bold text-white leading-tight">App Store</p>
                </div>
              </a>
              <a href="#" className="flex items-center gap-2 px-4 py-2.5 bg-black rounded-xl hover:bg-black/80 transition-colors">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.807 1.626a1 1 0 010 1.732l-2.807 1.626L15.206 12l2.492-2.492zM5.864 2.658L16.8 9.084l-2.302 2.302L5.864 2.658z"/></svg>
                <div>
                  <p className="text-[8px] text-white/60 leading-none">Download on</p>
                  <p className="text-xs font-bold text-white leading-tight">Google Play</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden md:block">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-foreground via-foreground/95 to-foreground/85 p-10">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10" style={{
          background: 'radial-gradient(circle at 70% 30%, hsl(268 84% 58% / 0.6) 0%, transparent 50%), radial-gradient(circle at 30% 70%, hsl(352 42% 55% / 0.4) 0%, transparent 50%)'
        }} />
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/15 blur-3xl" />

        <div className="relative flex items-center gap-10">
          {/* Phone mockup placeholder */}
          <div className="flex-shrink-0 w-48 h-48 rounded-3xl bg-gradient-to-br from-primary/20 to-violet-500/20 border border-white/10 flex flex-col items-center justify-center gap-3">
            <img src={elaraLogo} alt="ELARA" className="h-8 brightness-0 invert" />
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-white/60">MOBILE APP</span>
            </div>
            <Smartphone className="w-12 h-12 text-white/30" />
          </div>

          {/* Text content */}
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 text-primary text-xs font-bold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              EXCLUSIVE OFFER
            </div>
            <h2 className="text-3xl font-display font-bold text-white leading-tight">
              Download ELARA App
            </h2>
            <p className="text-lg text-white/50 mt-2 max-w-md">
              Get 15% OFF on your first order! Shop smarter with AI-powered recommendations, exclusive deals, and faster checkout.
            </p>

            <div className="flex items-center gap-4 mt-6">
              <a href="https://apps.apple.com/us/app/elara-beauty-health/id6761014159" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-6 py-3.5 bg-white rounded-2xl hover:bg-white/90 transition-colors shadow-lg group">
                <svg className="w-7 h-7 text-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                <div>
                  <p className="text-[10px] text-muted-foreground leading-none">Get it on</p>
                  <p className="text-base font-bold text-foreground leading-tight">App Store</p>
                </div>
              </a>
              <a href="#" className="flex items-center gap-3 px-6 py-3.5 bg-white rounded-2xl hover:bg-white/90 transition-colors shadow-lg group">
                <svg className="w-7 h-7 text-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.807 1.626a1 1 0 010 1.732l-2.807 1.626L15.206 12l2.492-2.492zM5.864 2.658L16.8 9.084l-2.302 2.302L5.864 2.658z"/></svg>
                <div>
                  <p className="text-[10px] text-muted-foreground leading-none">Download on</p>
                  <p className="text-base font-bold text-foreground leading-tight">Google Play</p>
                </div>
              </a>
            </div>

            <p className="text-xs text-white/30 mt-4">Use code <span className="font-mono font-bold text-primary">ELARA15</span> at checkout</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppDownloadBanner;
