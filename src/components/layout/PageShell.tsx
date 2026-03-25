import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import DesktopHeader from "./DesktopHeader";
import DesktopFooter from "./DesktopFooter";
import BottomNav from "./BottomNav";
import SearchOverlay from "@/components/SearchOverlay";

interface PageShellProps {
  title: string;
  backTo?: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
  hideDesktopHeader?: boolean;
}

const PageShell = ({ title, backTo = "/home", children, rightAction, hideDesktopHeader }: PageShellProps) => {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!hideDesktopHeader && <DesktopHeader onSearchClick={() => setSearchOpen(true)} />}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile header — hardware-accelerated for smooth transitions */}
      <header
        className="sticky top-0 z-40 bg-card/95 border-b border-border/30 md:hidden will-change-transform"
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          transform: 'translateZ(0)',
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to={backTo} className="p-2 -ml-2 rounded-xl hover:bg-secondary active:bg-secondary active:scale-90 transition-all duration-75">
              <ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
            </Link>
            <h1 className="text-lg font-display font-bold text-foreground">{title}</h1>
          </div>
          {rightAction}
        </div>
      </header>

      <div className="flex-1 pb-24 md:pb-0">
        <div className="max-w-7xl mx-auto w-full">
          {/* Desktop breadcrumb title */}
          <div className="hidden md:flex items-center gap-2 px-6 pt-6 pb-2">
            <Link to={backTo} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back
            </Link>
            <span className="text-sm text-muted-foreground">/</span>
            <h1 className="text-lg font-display font-bold text-foreground">{title}</h1>
          </div>
          {children}
        </div>
      </div>

      <div className="hidden md:block">
        <DesktopFooter />
      </div>
      <BottomNav />
    </div>
  );
};

export default PageShell;
