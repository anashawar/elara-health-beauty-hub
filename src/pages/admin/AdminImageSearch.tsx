import { useState, useCallback, useRef, useEffect } from "react";
import { ImagePlus, Play, Pause, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const BATCH_SIZE = 5;

const AdminImageSearch = () => {
  const [running, setRunning] = useState(false);
  const [totalMissing, setTotalMissing] = useState<number | null>(null);
  const [processed, setProcessed] = useState(0);
  const [found, setFound] = useState(0);
  const [failed, setFailed] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const stopRef = useRef(false);

  // Query the actual count of products without images from the DB
  const fetchMissingCount = useCallback(async () => {
    setLoading(true);
    try {
      // Get all product IDs
      const { count: totalProducts } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true });

      // Get distinct product IDs that have images
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
    // Fetch product IDs that do NOT have any entry in product_images
    // We need to do this in batches since there's no NOT IN subquery via JS client
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

    // Get all product IDs that have images
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
        // Fetch next batch of products without images
        const ids = await fetchMissingProductIds(BATCH_SIZE);

        if (ids.length === 0) {
          setDone(true);
          break;
        }

        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-product-images`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ product_ids: ids }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          if (resp.status === 402) {
            setError("API payment required — credits exhausted");
            break;
          }
          setError(`Search failed: ${err.error || resp.statusText}`);
          break;
        }

        const result = await resp.json();
        const batchFound = result.succeeded || 0;
        const batchFailed = result.failed || 0;
        const batchProcessed = batchFound + batchFailed + (result.skipped || 0);

        setProcessed(prev => prev + batchProcessed);
        setFound(prev => prev + batchFound);
        setFailed(prev => prev + batchFailed);

        // Refresh remaining count
        await fetchMissingCount();

        if (totalMissing !== null && totalMissing <= batchProcessed) {
          setDone(true);
          break;
        }

        // Delay between batches
        await new Promise(r => setTimeout(r, 2000));
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

  const progress = totalMissing !== null && totalMissing > 0
    ? Math.min(100, (processed / (processed + totalMissing)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ImagePlus className="w-6 h-6" />
          AI Product Image Finder
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Automatically search the web for product images using AI
        </p>
      </div>

      <div className="bg-card rounded-xl p-6 border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium">Progress</p>
            {loading ? (
              <p className="text-xs text-muted-foreground">Loading product count...</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {totalMissing !== null
                  ? `${totalMissing} products still need images`
                  : "Calculating..."}
                {processed > 0 && ` · ${processed} processed this session (${found} found, ${failed} not found)`}
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

        <div className="flex gap-3">
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
          {running && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching images for batch of {BATCH_SIZE} products...
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl p-6 border">
        <h3 className="font-semibold mb-2">How it works</h3>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>Only products without images are processed — already-imaged products are skipped</li>
          <li>AI searches trusted beauty retailer sites for matching product images</li>
          <li>Images are scored for relevance (brand match, title match, resolution)</li>
          <li>Only high-confidence matches are saved (score ≥ 10)</li>
          <li>Products are processed in batches of {BATCH_SIZE} to avoid timeouts</li>
          <li>You can pause and resume at any time — progress is saved automatically</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminImageSearch;
