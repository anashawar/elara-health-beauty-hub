import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import elaraLogo from "@/assets/elara-logo.png";

interface TopHeaderProps {
  onSearchClick: () => void;
}

const TopHeader = ({ onSearchClick }: TopHeaderProps) => {
  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
      <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
        <Link to="/" className="flex-shrink-0">
          <img src={elaraLogo} alt="ELARA" className="h-7" />
        </Link>

        <button
          onClick={onSearchClick}
          className="flex-1 flex items-center gap-2.5 px-4 py-2.5 bg-secondary/80 rounded-xl border border-border hover:border-primary/30 transition-all duration-200"
        >
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Search products, brands...</span>
        </button>
      </div>
    </header>
  );
};

export default TopHeader;
