import { useState, useCallback, useRef, useEffect } from "react";
import { ImagePlus, Play, Pause, CheckCircle2, Loader2, RotateCcw, XCircle, Image, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const BATCH_SIZE = 3; // Smaller batches = more reliable with multiple queries per product

interface ResultEntry {
  id: string;
  status: string;
  title?: string;
  url?: string;
  topScore?: number;
  error?: string;
}

const AdminImageSearch = () => {
  const [running, setRunning] = useState(false);
  const [totalMissing, setTotalMissing] = useState<number | null>(null);
  const [processed, setProcessed] = useState(0);
  const [found, setFound] = useState(0);
  const [failed, setFailed] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentResults, setRecentResults] = useState<ResultEntry[]>([]);
  const stopRef = useRef(false);

  const fetchMissingCount = useCallback(async () => {
    setLoading(true);
    try {
      const { count: totalProducts } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true });

      const { data: withImages } = await supabase
        .from("product_images")
        .select("product_id");

      const uniqueWithImages = new Set((withImages || []).map(r => r.product_id));
      const missing = (totalProducts || 0) - uniqueWithImages.size;
      setTotalMissing(Math.max(0, missing));
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMissingCount();
  }, [fetchMissingCount]);

  const fetchMissingProductIds = async (limit: number): Promise<string[]> => {
    let allProductIds: string[] = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("products")
        .select("id")
        .range(from, from + PAGE - 1);
      if (error) throw error;
      allProductIds = allProductIds.concat((data || []).map(r => r.id));
      if (!data || data.length < PAGE) break;
      from += PAGE;
    }

    let imageProductIds: string[] = [];
    from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("product_images")
        .select("product_id")
        .range(from, from + PAGE - 1);
      if (error) throw error;
      imageProductIds = imageProductIds.concat((data || []).map(r => r.product_id));
      if (!data || data.length < PAGE) break;
      from += PAGE;
    }

    const hasImage = new Set(imageProductIds);
    const missing = allProductIds.filter(id => !hasImage.has(id));
    return missing.slice(0, limit);
  };

  const runBatch = useCallback(async () => {
    setRunning(true);
    setError(null);
    setDone(false);
    stopRef.current = false;

    while (!stopRef.current) {
      try {
        const ids = await fetchMissingProductIds(BATCH_SIZE);

        if (ids.length === 0) {
          setDone(true);
          break;
        }

        const resp = await supabase.functions.invoke("search-product-images", {
          body: { product_ids: ids },
        });

        if (resp.error) {
          setError(`Search failed: ${resp.error.message}`);
          break;
        }

        const result = resp.data;
        const batchFound = result.succeeded || 0;
        const batchFailed = result.failed || 0;
        const batchProcessed = batchFound + batchFailed + (result.skipped || 0);

        setProcessed(prev => prev + batchProcessed);
        setFound(prev => prev + batchFound);
        setFailed(prev => prev + batchFailed);

        // Add results to log
        if (result.results) {
          setRecentResults(prev => [...(result.results as ResultEntry[]).filter(r => r.status !== "skipped"), ...prev].slice(0, 50));
        }

        await fetchMissingCount();

        if (totalMissing !== null && totalMissing <= batchProcessed) {
          setDone(true);
          break;
        }

        // Delay between batches
        await new Promise(r => setTimeout(r, 1500));
      } catch (e: any) {
        setError(e.message);
        break;
      }
    }

    setRunning(false);
  }, [fetchMissingCount, totalMissing]);

  const stop = () => {
    stopRef.current = true;
  };

  const resetSession = () => {
    setProcessed(0);
    setFound(0);
    setFailed(0);
    setDone(false);
    setError(null);
    setRecentResults([]);
    fetchMissingCount();
  };

  const progress = totalMissing !== null && totalMissing > 0
    ? Math.min(100, (processed / (processed + totalMissing)) * 100)
    : 0;

  const successRate = processed > 0 ? Math.round((found / processed) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ImagePlus className="w-6 h-6" />
          AI Product Image Finder
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Searches multiple beauty retailers & CDNs for product images using AI-powered web search
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl p-4 border text-center">
          <p className="text-2xl font-bold text-foreground">{totalMissing ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Missing Images</p>
        </div>
        <div className="bg-card rounded-xl p-4 border text-center">
          <p className="text-2xl font-bold text-emerald-600">{found}</p>
          <p className="text-xs text-muted-foreground">Found</p>
        </div>
        <div className="bg-card rounded-xl p-4 border text-center">
          <p className="text-2xl font-bold text-amber-600">{failed}</p>
          <p className="text-xs text-muted-foreground">Not Found</p>
        </div>
        <div className="bg-card rounded-xl p-4 border text-center">
          <p className="text-2xl font-bold text-primary">{successRate}%</p>
          <p className="text-xs text-muted-foreground">Success Rate</p>
        </div>
      </div>

      {/* Progress & Controls */}
      <div className="bg-card rounded-xl p-6 border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium">Progress</p>
            {loading ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {processed > 0 && `${processed} processed this session`}
              </p>
            )}
          </div>
          {done && (
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-bold">Complete!</span>
            </div>
          )}
        </div>

        <Progress value={progress} className="h-3 mb-4" />

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          {!running ? (
            <Button onClick={runBatch} disabled={done || loading || totalMissing === 0} className="gap-2">
              <Play className="w-4 h-4" />
              {processed > 0 ? "Resume Search" : "Start Search"}
            </Button>
          ) : (
            <Button onClick={stop} variant="outline" className="gap-2">
              <Pause className="w-4 h-4" />
              Pause
            </Button>
          )}
          {processed > 0 && !running && (
            <Button onClick={resetSession} variant="ghost" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Reset Session
            </Button>
          )}
          {running && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching images for batch of {BATCH_SIZE}...
            </div>
          )}
        </div>
      </div>

      {/* Recent Results Log */}
      {recentResults.length > 0 && (
        <div className="bg-card rounded-xl p-6 border">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Image className="w-4 h-4" />
            Recent Results
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {recentResults.map((r, i) => (
              <div key={`${r.id}-${i}`} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50 text-sm">
                {r.status === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : r.status === "no_confident_match" || r.status === "no_images_found" ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {r.title || r.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.status === "success" && "Image found ✓"}
                    {r.status === "no_confident_match" && `No confident match (score: ${r.topScore || 0})`}
                    {r.status === "no_images_found" && "No verified images found"}
                    {r.status === "error" && (r.error || "Error")}
                    {r.status === "payment_required" && "API credits exhausted"}
                  </p>
                </div>
                {r.status === "success" && r.url && (
                  <img src={r.url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl p-6 border">
        <h3 className="font-semibold mb-2">How it works</h3>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>Uses multiple search strategies per product — retailer sites, CDNs, and general web</li>
          <li>Tries up to 4 query variations per product for maximum coverage</li>
          <li>Scores images by brand match, title match, trusted CDN, and resolution</li>
          <li>Verifies each image exists and meets minimum quality (5KB+)</li>
          <li>Only saves the single best-scoring verified image per product</li>
          <li>Processes {BATCH_SIZE} products per batch to stay within API limits</li>
          <li>You can pause and resume at any time</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminImageSearch;
