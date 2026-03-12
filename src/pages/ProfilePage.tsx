import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, Heart, MapPin, Bell, Settings, Package, LogOut } from "lucide-react";
import BottomNav from "@/components/layout/BottomNav";

const menuItems = [
  { icon: Package, label: "My Orders", path: "/orders" },
  { icon: Heart, label: "Wishlist", path: "/wishlist" },
  { icon: MapPin, label: "Addresses", path: "#" },
  { icon: Bell, label: "Notifications", path: "#" },
  { icon: Settings, label: "Settings", path: "#" },
];

const ProfilePage = () => {
  return (
    <div className="min-h-screen bg-background pb-24 max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/" className="p-1"><ArrowLeft className="w-5 h-5 text-foreground" /></Link>
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
            <h3 className="text-base font-bold text-foreground">Welcome to ELARA</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Sign in for a personalized experience</p>
          </div>
        </div>
        <Link to="/auth" className="block w-full mt-4 py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity text-center">
          Sign In / Create Account
        </Link>
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

      {/* Order Tracking Info */}
      <div className="mx-4 mt-4 bg-card rounded-2xl p-4 shadow-premium">
        <h3 className="text-sm font-bold text-foreground mb-3">Order Status Legend</h3>
        <div className="space-y-2">
          {[
            { status: "Pending", color: "bg-amber-400" },
            { status: "Processing", color: "bg-blue-400" },
            { status: "Shipped", color: "bg-primary" },
            { status: "Delivered", color: "bg-sage" },
          ].map(s => (
            <div key={s.status} className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-4 mt-4 text-center">
        <p className="text-[10px] text-muted-foreground">ELARA v1.0 — Iraq's Smart Health & Beauty</p>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
