import { useState, forwardRef } from "react";
import { Bell, CheckCheck, Package, Tag, Sparkles, Gift, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetPortal, SheetTitle } from "@/components/ui/sheet";

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  promotional: { icon: Gift, color: "text-primary", bg: "bg-primary/10" },
  order: { icon: Package, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  product: { icon: Tag, color: "text-amber-600", bg: "bg-amber-500/10" },
  personalized: { icon: Sparkles, color: "text-violet-600", bg: "bg-violet-500/10" },
};

const NotificationItem = forwardRef<HTMLButtonElement, { notification: Notification; onRead: (n: Notification) => void }>(
  ({ notification, onRead }, ref) => {
    const config = typeConfig[notification.type] || typeConfig.promotional;
    const Icon = config.icon;
    const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

    return (
      <button
        ref={ref}
        onClick={() => onRead(notification)}
        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-all active:scale-[0.98] ${
          notification.is_read
            ? "bg-transparent"
            : "bg-primary/[0.04]"
        }`}
      >
        <div className={`w-9 h-9 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          {notification.icon && notification.icon !== "🔔" ? (
            <span className="text-base">{notification.icon}</span>
          ) : (
            <Icon className={`w-4 h-4 ${config.color}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-[13px] font-semibold leading-snug ${notification.is_read ? "text-foreground/60" : "text-foreground"}`}>
              {notification.title}
            </p>
            {!notification.is_read && (
              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className={`text-[12px] leading-relaxed mt-0.5 line-clamp-2 ${notification.is_read ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
            {notification.body}
          </p>
          <p className="text-[10px] text-muted-foreground/40 mt-1">{timeAgo}</p>
        </div>
        {notification.link_url && (
          <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0 mt-2 rtl:rotate-180" />
        )}
      </button>
    );
  }
);
NotificationItem.displayName = "NotificationItem";

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
          <div className="flex-1 overflow-y-auto divide-y divide-border/30">
            {notifications.length === 0 ? (
              <EmptyState />
            ) : (
              notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onRead={handleRead} />
              ))
            )}
          </div>
        </SheetContent>

        <SheetPortal>
          <AnimatePresence>
            {open && (
              <div className="md:hidden fixed inset-0 z-[9999]">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 bg-black/35"
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 400 }}
                  className="absolute inset-0 flex flex-col bg-background"
                  style={{
                    paddingTop: "env(safe-area-inset-top, 0px)",
                    paddingBottom: "env(safe-area-inset-bottom, 0px)",
                    minHeight: "100dvh",
                  }}
                >
                  <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
                    <div className="w-9 h-1 rounded-full bg-muted-foreground/20" />
                  </div>

                  <div className="flex items-start justify-between gap-3 px-5 py-3 flex-shrink-0">
                    <div className="min-w-0">
                      <h2 className="text-[17px] font-display font-bold text-foreground">Notifications</h2>
                      {unreadCount > 0 && (
                        <p className="text-[12px] text-muted-foreground mt-0.5">{unreadCount} unread</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllAsRead.mutate()}
                          className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-primary bg-primary/10 rounded-full active:scale-95 transition-all"
                        >
                          <CheckCheck className="w-3 h-3" />
                          Read all
                        </button>
                      )}
                      <button
                        onClick={() => setOpen(false)}
                        className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>

                  <div className="h-px bg-border/40 mx-4 flex-shrink-0" />

                  <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-border/20">
                    {notifications.length === 0 ? (
                      <EmptyState />
                    ) : (
                      notifications.map((n) => (
                        <NotificationItem key={n.id} notification={n} onRead={handleRead} />
                      ))
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </SheetPortal>
      </Sheet>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
      <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-3">
        <Bell className="w-6 h-6 text-muted-foreground/30" />
      </div>
      <p className="text-sm font-semibold text-foreground">No notifications yet</p>
      <p className="text-xs text-muted-foreground mt-1">
        We'll notify you about offers, orders & more
      </p>
    </div>
  );
}
