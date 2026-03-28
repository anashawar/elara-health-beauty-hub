import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, MessageSquare, TrendingUp, Users, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface Rating {
  id: string;
  order_id: string;
  user_id: string;
  quality_rating: number | null;
  delivery_time_rating: number | null;
  expectation_rating: number | null;
  service_rating: number | null;
  price_rating: number | null;
  overall_rating: number | null;
  comment: string | null;
  created_at: string;
  profile_name?: string;
  profile_phone?: string;
}

const Stars = ({ value }: { value: number | null }) => {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= value ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/20"}`}
        />
      ))}
    </div>
  );
};

export default function AdminRatings() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("order_ratings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // Fetch profile names
    const userIds = [...new Set((data || []).map((r) => r.user_id))];
    let profileMap: Record<string, { name: string; phone: string }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);
      (profiles || []).forEach((p) => {
        profileMap[p.user_id] = { name: p.full_name || "Unknown", phone: p.phone || "" };
      });
    }

    setRatings(
      (data || []).map((r) => ({
        ...r,
        profile_name: profileMap[r.user_id]?.name || "Unknown",
        profile_phone: profileMap[r.user_id]?.phone || "",
      }))
    );
    setLoading(false);
  };

  const filtered = filter === "all"
    ? ratings
    : filter === "with-comments"
    ? ratings.filter((r) => r.comment)
    : filter === "low"
    ? ratings.filter((r) => (r.overall_rating || 0) <= 2)
    : filter === "high"
    ? ratings.filter((r) => (r.overall_rating || 0) >= 4)
    : ratings;

  const avgOverall = ratings.length
    ? (ratings.reduce((s, r) => s + (r.overall_rating || 0), 0) / ratings.length).toFixed(1)
    : "0";
  const avgQuality = ratings.length
    ? (ratings.reduce((s, r) => s + (r.quality_rating || 0), 0) / ratings.length).toFixed(1)
    : "0";
  const avgDelivery = ratings.length
    ? (ratings.reduce((s, r) => s + (r.delivery_time_rating || 0), 0) / ratings.length).toFixed(1)
    : "0";
  const avgService = ratings.length
    ? (ratings.reduce((s, r) => s + (r.service_rating || 0), 0) / ratings.length).toFixed(1)
    : "0";
  const withComments = ratings.filter((r) => r.comment).length;

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: ratings.filter((r) => r.overall_rating === star).length,
    pct: ratings.length ? (ratings.filter((r) => r.overall_rating === star).length / ratings.length) * 100 : 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Customer Feedback</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{ratings.length} total ratings</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{avgOverall}</p>
                <p className="text-[11px] text-muted-foreground">Overall Avg</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{ratings.length}</p>
                <p className="text-[11px] text-muted-foreground">Total Ratings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{avgService}</p>
                <p className="text-[11px] text-muted-foreground">Service Avg</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{withComments}</p>
                <p className="text-[11px] text-muted-foreground">With Comments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution + Category averages */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {ratingDistribution.map((d) => (
              <div key={d.star} className="flex items-center gap-3">
                <span className="text-sm font-medium w-4">{d.star}</span>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right">{d.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Category Averages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Quality", icon: "✨", avg: avgQuality },
              { label: "Delivery Time", icon: "⚡", avg: avgDelivery },
              { label: "Met Expectations", icon: "🎯", avg: ratings.length ? (ratings.reduce((s, r) => s + (r.expectation_rating || 0), 0) / ratings.length).toFixed(1) : "0" },
              { label: "Service", icon: "💎", avg: avgService },
              { label: "Price Value", icon: "💰", avg: ratings.length ? (ratings.reduce((s, r) => s + (r.price_rating || 0), 0) / ratings.length).toFixed(1) : "0" },
            ].map((cat) => (
              <div key={cat.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  <span className="text-sm text-foreground">{cat.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{cat.avg}</span>
                  <span className="text-muted-foreground text-xs">/ 5</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Filter + Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">All Ratings</CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44 h-9 text-xs">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="with-comments">With Comments</SelectItem>
              <SelectItem value="high">High (4-5 ⭐)</SelectItem>
              <SelectItem value="low">Low (1-2 ⭐)</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Star className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No ratings found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Overall</TableHead>
                    <TableHead className="hidden md:table-cell">Quality</TableHead>
                    <TableHead className="hidden md:table-cell">Delivery</TableHead>
                    <TableHead className="hidden md:table-cell">Service</TableHead>
                    <TableHead className="hidden md:table-cell">Price</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{r.profile_name}</p>
                          {r.profile_phone && (
                            <p className="text-[11px] text-muted-foreground">{r.profile_phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          #{r.order_id.slice(0, 8)}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Stars value={r.overall_rating} />
                          {r.overall_rating && (
                            <Badge
                              variant={r.overall_rating >= 4 ? "default" : r.overall_rating >= 3 ? "secondary" : "destructive"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {r.overall_rating}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell"><Stars value={r.quality_rating} /></TableCell>
                      <TableCell className="hidden md:table-cell"><Stars value={r.delivery_time_rating} /></TableCell>
                      <TableCell className="hidden md:table-cell"><Stars value={r.service_rating} /></TableCell>
                      <TableCell className="hidden md:table-cell"><Stars value={r.price_rating} /></TableCell>
                      <TableCell>
                        {r.comment ? (
                          <p className="text-xs text-foreground max-w-[200px] truncate" title={r.comment}>
                            {r.comment}
                          </p>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
