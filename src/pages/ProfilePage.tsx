import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Heart, MapPin, Settings, Package, LogOut } from "lucide-react";
import BottomNav from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/sonner";

const menuItems = [
  { icon: Package, label: "My Orders", path: "/orders" },
  { icon: Heart, label: "Wishlist", path: "/wishlist" },
  { icon: MapPin, label: "Addresses", path: "/addresses" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const ProfilePage = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast("Signed out");
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-background pb-24 max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/home" className="p-1"><ArrowLeft className="w-5 h-5 text-foreground" /></Link>
          <h1 className="text-lg font-display font-bold text-foreground">Profile</h1>
        </div>
      </header>

      {/* User Card */}
      <div className="mx-4 mt-4 bg-card rounded-2xl p-5 shadow-premium">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
            <span className="text-2xl">👤</span>
          </div>
          <div>
            {user ? (
              <>
                <h3 className="text-base font-bold text-foreground">
                  {user.user_metadata?.full_name || "ELARA User"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold text-foreground">Welcome to ELARA</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Sign in for a personalized experience</p>
              </>
            )}
          </div>
        </div>
        {!user && (
          <Link to="/auth" className="block w-full mt-4 py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity text-center">
            Sign In / Create Account
          </Link>
        )}
      </div>

      {/* Menu */}
      <div className="mx-4 mt-4 bg-card rounded-2xl shadow-premium overflow-hidden">
        {menuItems.map((item, idx) => (
          <Link
            key={item.label}
            to={item.path}
            className={`flex items-center justify-between px-4 py-4 hover:bg-secondary/50 transition-colors ${idx < menuItems.length - 1 ? "border-b border-border/50" : ""}`}
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        ))}
      </div>

      {/* Sign Out */}
      {user && (
        <div className="mx-4 mt-4 bg-card rounded-2xl shadow-premium overflow-hidden">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-destructive/5 transition-colors text-destructive"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      )}

      <div className="mx-4 mt-4 text-center">
        <p className="text-[10px] text-muted-foreground">ELARA v1.0 — Iraq's Smart Health & Beauty</p>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
