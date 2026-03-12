import { useState } from "react";
import { Star, Send, User, ThumbsUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/sonner";

interface ReviewSectionProps {
  productId: string;
}

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  reviewer_name: string | null;
  created_at: string;
}

const StarRating = ({
  rating,
  onRate,
  size = "sm",
  interactive = false,
}: {
  rating: number;
  onRate?: (r: number) => void;
  size?: "sm" | "lg";
  interactive?: boolean;
}) => {
  const [hover, setHover] = useState(0);
  const sizeClass = size === "lg" ? "w-7 h-7" : "w-3.5 h-3.5";

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          className={interactive ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            className={`${sizeClass} transition-colors ${
              star <= (hover || rating)
                ? "fill-amber-400 text-amber-400"
                : "text-border fill-transparent"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const ReviewSection = ({ productId }: ReviewSectionProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Review[];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in");
      if (rating === 0) throw new Error("Please select a rating");

      const { error } = await supabase.from("reviews").insert({
        product_id: productId,
        user_id: user.id,
        rating,
        title: title.trim() || null,
        comment: comment.trim() || null,
        reviewer_name: name.trim() || user.user_metadata?.full_name || "Anonymous",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      setShowForm(false);
      setRating(0);
      setTitle("");
      setComment("");
      setName("");
      toast("Review submitted! ✨");
    },
    onError: (e: Error) => {
      toast(e.message);
    },
  });

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length > 0
      ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100
      : 0,
  }));

  const userHasReviewed = user && reviews.some(r => r.user_id === user.id);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  return (
    <div className="mt-8">
      <h3 className="text-base font-display font-bold text-foreground mb-4">Reviews & Ratings</h3>

      {/* Rating Summary Card */}
      <div className="bg-card rounded-2xl border border-border/50 p-4">
        <div className="flex items-center gap-5">
          {/* Big average */}
          <div className="text-center">
            <p className="text-4xl font-extrabold text-foreground">{avgRating.toFixed(1)}</p>
            <StarRating rating={Math.round(avgRating)} size="sm" />
            <p className="text-[10px] text-muted-foreground mt-1">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
          </div>

          {/* Rating bars */}
          <div className="flex-1 space-y-1">
            {ratingCounts.map(rc => (
              <div key={rc.star} className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-muted-foreground w-3">{rc.star}</span>
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${rc.pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground w-4 text-right">{rc.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Write Review Button */}
      {user && !userHasReviewed && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowForm(!showForm)}
          className="w-full mt-3 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl text-sm font-semibold text-primary hover:from-primary/15 transition-all"
        >
          <Star className="w-4 h-4" />
          Write a Review
        </motion.button>
      )}

      {!user && (
        <p className="text-center text-xs text-muted-foreground mt-3 py-3 bg-secondary/50 rounded-xl">
          <a href="/auth" className="text-primary font-semibold">Sign in</a> to write a review
        </p>
      )}

      {/* Review Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 bg-card rounded-2xl border border-primary/20 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground">Your Review</h4>
                <button onClick={() => setShowForm(false)} className="text-xs text-muted-foreground">Cancel</button>
              </div>

              {/* Star selector */}
              <div className="flex flex-col items-center gap-2 py-2">
                <p className="text-xs text-muted-foreground">Tap to rate</p>
                <StarRating rating={rating} onRate={setRating} size="lg" interactive />
                {rating > 0 && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-semibold text-primary"
                  >
                    {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
                  </motion.p>
                )}
              </div>

              {/* Name */}
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name (optional)"
                maxLength={50}
                className="w-full bg-secondary text-foreground text-sm px-4 py-3 rounded-xl outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
              />

              {/* Title */}
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Review title (optional)"
                maxLength={100}
                className="w-full bg-secondary text-foreground text-sm px-4 py-3 rounded-xl outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
              />

              {/* Comment */}
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Share your experience with this product..."
                rows={3}
                maxLength={500}
                className="w-full bg-secondary text-foreground text-sm px-4 py-3 rounded-xl outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 resize-none"
              />
              <p className="text-[10px] text-muted-foreground text-right -mt-2">{comment.length}/500</p>

              {/* Submit */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => submitMutation.mutate()}
                disabled={rating === 0 || submitMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground font-bold rounded-2xl text-sm disabled:opacity-50 shadow-md"
              >
                {submitMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Submit Review
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reviews.length > 0 ? (
        <div className="mt-4 space-y-3">
          {reviews.map((review, idx) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-card rounded-2xl border border-border/50 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{review.reviewer_name || "Anonymous"}</p>
                    <p className="text-[10px] text-muted-foreground">{timeAgo(review.created_at)}</p>
                  </div>
                </div>
                <StarRating rating={review.rating} size="sm" />
              </div>

              {review.title && (
                <p className="text-sm font-semibold text-foreground mt-3">{review.title}</p>
              )}
              {review.comment && (
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{review.comment}</p>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">No reviews yet</p>
          <p className="text-xs text-muted-foreground mt-1">Be the first to share your experience!</p>
        </div>
      )}
    </div>
  );
};

export default ReviewSection;
