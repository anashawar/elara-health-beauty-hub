import { Search, Bell, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import elaraLogo from "@/assets/elara-logo.png";

interface TopHeaderProps {
  onSearchClick: () => void;
}

const TopHeader = ({ onSearchClick }: TopHeaderProps) => {
  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        <Link to="/" className="flex items-center">
          <img src={elaraLogo} alt="ELARA" className="h-7" />
        </Link>

        <div className="flex items-center gap-1">
          <button
            onClick={onSearchClick}
            className="p-2.5 rounded-xl hover:bg-secondary transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5 text-foreground" />
          </button>
          <Link to="/wishlist" className="p-2.5 rounded-xl hover:bg-secondary transition-colors">
            <Heart className="w-5 h-5 text-foreground" />
          </Link>
          <button className="p-2.5 rounded-xl hover:bg-secondary transition-colors relative" aria-label="Notifications">
            <Bell className="w-5 h-5 text-foreground" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
