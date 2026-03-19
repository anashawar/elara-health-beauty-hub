import { useState } from "react";
import { createPortal } from "react-dom";
import { Bell, CheckCheck, Package, Tag, Sparkles, Gift, ChevronRight, X, Megaphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const typeConfig: Record<string, { icon: any; color: string; bg: string; accent: string }> = {
  promotional: { icon: Gift, color: "text-primary", bg: "bg-primary/10", accent: "border-primary/20" },
  order: { icon: Package, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", accent: "border-emerald-500/20" },
  product: { icon: Tag, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", accent: "border-amber-500/20" },
  personalized: { icon: Sparkles, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", accent: "border-violet-500/20" },
  campaign: { icon: Megaphone, color: "text-primary", bg: "bg-primary/10", accent: "border-primary/20" },
};

function NotificationCard({ notification, onRead, index }: { notification: Notification; onRead: (n: Notification) => void; index: number }) {
  const config = typeConfig[notification.type] || typeConfig.promotional;
  const Icon = config.icon;
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      onClick={() => onRead(notification)}
      className={`w-full flex items-start gap-3 p-3.5 text-left rounded-2xl transition-all active:scale-[0.97] border ${
        notification.is_read
          ? "bg-card/50 border-border/30"
          : `bg-card border-l-2 ${config.accent} shadow-sm`
      }`}
    >
      <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
        {notification.icon && notification.icon !== "🔔" ? (
          <span className="text-lg">{notification.icon}</span>
        ) : (
          <Icon className={`w-[18px] h-[18px] ${config.color}`} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-[13px] font-semibold leading-snug ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5 animate-pulse" />
          )}
        </div>
        <p className={`text-[12px] leading-relaxed mt-0.5 line-clamp-2 ${notification.is_read ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
          {notification.body}
        </p>
        <p className="text-[10px] text-muted-foreground/40 mt-1.5 font-medium">{timeAgo}</p>
      </div>
      {notification.link_url && (
        <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0 mt-3 rtl:rotate-180" />
      )}
    </motion.button>
  );
}

function MobileNotificationPanel({ open, onClose, notifications, unreadCount, onRead, onMarkAllRead }: {
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  onRead: (n: Notification) => void;
  onMarkAllRead: () => void;
}) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] md:hidden" style={{ touchAction: "none" }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 380 }}
            className="absolute inset-0 flex flex-col bg-background/95 backdrop-blur-xl"
            style={{
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/15" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bell className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-bold text-foreground">Notifications</h2>
                  {unreadCount > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {unreadCount} new notification{unreadCount !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllRead}
                    className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-primary bg-primary/10 rounded-xl active:scale-95 transition-all"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Read all
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl bg-secondary/80 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X className="w-4.5 h-4.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border/30 mx-5 flex-shrink-0" />

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-2" style={{ WebkitOverflowScrolling: "touch" }}>
              {notifications.length === 0 ? (
                <EmptyState />
              ) : (
                notifications.map((n, i) => (
                  <NotificationCard key={n.id} notification={n} onRead={onRead} index={i} />
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  if (!user) return null;

  const handleRead = (n: Notification) => {
    if (!n.is_read) markAsRead.mutate(n.id);
    if (n.link_url) {
      setOpen(false);
      navigate(n.link_url);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative p-2 rounded-xl hover:bg-secondary active:scale-90 transition-all"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-1 shadow-float"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Desktop: Sheet panel */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="hidden md:flex w-full max-w-sm p-0 flex-col">
          <SheetHeader className="px-5 py-4 border-b border-border/40">
            <div className="flex items-center justify-between w-full">
              <div>
                <SheetTitle className="text-lg font-display font-bold text-foreground text-left">
                  Notifications
                </SheetTitle>
                {unreadCount > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 text-left">
                    {unreadCount} unread
                  </p>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead.mutate()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/15 active:scale-95 transition-all"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Read all
                </button>
              )}
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {notifications.length === 0 ? (
              <EmptyState />
            ) : (
              notifications.map((n, i) => (
                <NotificationCard key={n.id} notification={n} onRead={handleRead} index={i} />
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile: Portal-based panel */}
      <MobileNotificationPanel
        open={open}
        onClose={() => setOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onRead={handleRead}
        onMarkAllRead={() => markAllAsRead.mutate()}
      />
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-20">
      <div className="w-16 h-16 rounded-2xl bg-secondary/80 flex items-center justify-center mb-4">
        <Bell className="w-7 h-7 text-muted-foreground/25" />
      </div>
      <p className="text-sm font-display font-bold text-foreground">All caught up!</p>
      <p className="text-xs text-muted-foreground mt-1.5 max-w-[200px]">
        We'll notify you about offers, orders & more
      </p>
    </div>
  );
}
