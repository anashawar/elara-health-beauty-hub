import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import DesktopHeader from "./DesktopHeader";
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
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {!hideDesktopHeader && <DesktopHeader onSearchClick={() => setSearchOpen(true)} />}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/30 md:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to={backTo} className="p-2 -ml-2 rounded-xl hover:bg-secondary active:bg-secondary active:scale-90 transition-all">
              <ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
            </Link>
            <h1 className="text-lg font-display font-bold text-foreground">{title}</h1>
          </div>
          {rightAction}
        </div>
      </header>

      <div className="app-container">
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

      <BottomNav />
    </div>
  );
};

export default PageShell;
