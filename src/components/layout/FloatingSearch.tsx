import { useState } from "react";
import { Search } from "lucide-react";
import SearchOverlay from "@/components/SearchOverlay";

const FloatingSearch = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed z-30 p-2.5 bg-card/90 backdrop-blur-md rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)', right: '16px' }}
        aria-label="Search"
      >
        <Search className="w-4 h-4 text-foreground" />
      </button>
      <SearchOverlay isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default FloatingSearch;
