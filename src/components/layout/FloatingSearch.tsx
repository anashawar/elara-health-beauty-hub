import { useState } from "react";
import { Search } from "lucide-react";
import SearchOverlay from "@/components/SearchOverlay";

const FloatingSearch = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 right-4 z-30 p-2.5 bg-card/90 backdrop-blur-md rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all"
        aria-label="Search"
      >
        <Search className="w-4 h-4 text-foreground" />
      </button>
      <SearchOverlay isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default FloatingSearch;
